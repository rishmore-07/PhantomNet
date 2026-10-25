import {
  AdaptiveDeploymentRecord,
  Alert,
  AttackPathStep,
  DecoyDeploymentRecord,
  IncidentReport,
  NodeId,
  NodeStatus,
  ScoreComponent,
  SimulationSession,
} from './types';
import { calculateThreatScore, evaluateEventAlert, getThreatLevel } from './rules';
import { INITIAL_DECOYS } from '../data/decoysSeed';
import { INITIAL_EDGES } from '../data/networkSeed';
import { findAsset } from './assets';
import { templateById } from '../data/adaptiveDecoys';
import { SIMULATION_SCOPE_NOTE, mitreForEvent, unmappedReason } from './mitre';

/**
 * Derives all alerts triggered by the session's recorded events.
 */
export function deriveAlerts(session: SimulationSession): Alert[] {
  const alerts: Alert[] = [];
  for (const evt of session.events) {
    const alert = evaluateEventAlert(evt);
    if (alert) {
      alerts.push(alert);
    }
  }
  // Chronological or newest first based on use
  return alerts;
}

/**
 * Derives current threat score (0 - 100).
 */
export function deriveThreatScore(session: SimulationSession): number {
  return calculateThreatScore(session.events);
}

/**
 * Derives threat level metadata.
 */
export function deriveThreatLevel(session: SimulationSession) {
  return getThreatLevel(deriveThreatScore(session));
}

/**
 * Derives the sequenced attacker path across nodes and edges.
 */
export function deriveAttackPath(session: SimulationSession): {
  visitedNodeIds: Set<NodeId>;
  traversedEdgeIds: Set<string>;
  steps: AttackPathStep[];
  pathNodes: NodeId[];
} {
  const visitedNodeIds = new Set<NodeId>(['gateway']);
  const traversedEdgeIds = new Set<string>();
  const steps: AttackPathStep[] = [];
  const pathNodes: NodeId[] = ['gateway'];

  for (const event of session.events) {
    if (event.type === 'LATERAL_MOVE_ATTEMPT' && event.sourceNodeId && event.targetNodeId) {
      visitedNodeIds.add(event.targetNodeId);
      pathNodes.push(event.targetNodeId);
      steps.push({
        fromNodeId: event.sourceNodeId,
        toNodeId: event.targetNodeId,
        timestamp: event.timestamp,
        eventId: event.id,
        type: event.type,
      });

      // Find edge id matching source and target (undirected)
      const u = event.sourceNodeId;
      const v = event.targetNodeId;
      const edgeId = edgeIdBetween(u, v);
      if (edgeId) traversedEdgeIds.add(edgeId);
    } else if (
      event.type !== 'DECOY_DEPLOYED' &&
      event.actor !== 'system' &&
      event.targetNodeId
    ) {
      visitedNodeIds.add(event.targetNodeId);
    }
  }

  return {
    visitedNodeIds,
    traversedEdgeIds,
    steps,
    pathNodes,
  };
}

function edgeIdBetween(a: NodeId, b: NodeId): string | null {
  const edge = INITIAL_EDGES.find(
    (item) =>
      (item.source === a && item.target === b) || (item.source === b && item.target === a)
  );
  return edge ? edge.id : null;
}

/**
 * Derives operational status (healthy, suspicious, triggered) for each node.
 */
export function deriveNodeStatuses(
  session: SimulationSession
): Record<NodeId, NodeStatus> {
  const statuses: Record<NodeId, NodeStatus> = {
    gateway: 'healthy',
    web: 'healthy',
    workstation: 'healthy',
    finance: 'healthy',
    database: 'healthy',
    'decoy-vault': 'healthy',
  };

  for (const evt of session.events) {
    const target = evt.targetNodeId;
    if (!target) continue;

    // Triggered: Decoy document opened, fake credential used, or honeytoken inspected
    if (
      evt.type === 'SENSITIVE_FILE_OPENED' ||
      evt.type === 'HONEYTOKEN_VIEWED' ||
      evt.type === 'FAKE_CREDENTIAL_USED'
    ) {
      statuses[target] = 'triggered';
    } else if (
      (evt.type === 'SCAN_HOST' ||
        evt.type === 'LOGIN_FAILED' ||
        evt.type === 'LATERAL_MOVE_ATTEMPT') &&
      statuses[target] !== 'triggered'
    ) {
      statuses[target] = 'suspicious';
    }
  }

  return statuses;
}

export function deriveDecoyDeployments(session: SimulationSession): DecoyDeploymentRecord[] {
  const baseline: DecoyDeploymentRecord[] = INITIAL_DECOYS.map((asset) => ({
    assetId: asset.id,
    assetLabel: asset.label,
    nodeId: asset.nodeId,
    honeytokenId: asset.honeytokenId,
    kind: asset.kind,
    origin: 'baseline',
    reason: 'Present in the baseline simulated environment.',
    deployedAt: session.startedAt,
  }));

  const adaptive: DecoyDeploymentRecord[] = [];
  for (const event of session.events) {
    if (event.type !== 'DECOY_DEPLOYED' || !event.assetId || !event.targetNodeId) continue;
    const template = templateById(event.assetId);
    adaptive.push({
      assetId: event.assetId,
      assetLabel: event.assetLabel || template?.label || event.assetId,
      nodeId: event.targetNodeId,
      honeytokenId: event.honeytokenId || template?.honeytokenId || '',
      kind: template?.kind || 'file',
      origin: 'adaptive',
      reason: event.deploymentReason || event.explanation,
      policyId: event.policyId,
      deployedAt: event.timestamp,
      eventId: event.id,
    });
  }

  return [...baseline, ...adaptive];
}

export function deriveScoreBreakdown(session: SimulationSession): ScoreComponent[] {
  const grouped = new Map<ScoreComponent['eventType'], { count: number; delta: number }>();
  for (const event of session.events) {
    if (!event.scoreDelta) continue;
    const current = grouped.get(event.type) || { count: 0, delta: event.scoreDelta };
    current.count += 1;
    current.delta = event.scoreDelta;
    grouped.set(event.type, current);
  }
  return Array.from(grouped.entries()).map(([eventType, value]) => ({
    eventType,
    count: value.count,
    deltaEach: value.delta,
    subtotal: value.count * value.delta,
  }));
}

export interface ReportContext {
  recordedEventCount?: number;
  viewingIndex?: number | null;
}

/**
 * Derives the comprehensive incident report object.
 */
export function deriveIncidentReport(
  session: SimulationSession,
  context?: ReportContext
): IncidentReport {
  const score = deriveThreatScore(session);
  const alerts = deriveAlerts(session);
  const path = deriveAttackPath(session);

  const alertCounts = {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    high: alerts.filter((a) => a.severity === 'high').length,
    medium: alerts.filter((a) => a.severity === 'medium').length,
    low: alerts.filter((a) => a.severity === 'low').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  };

  const triggeredDecoys: IncidentReport['triggeredDecoys'] = [];
  const seenAssets = new Set<string>();

  for (const evt of session.events) {
    if (
      evt.assetId &&
      !seenAssets.has(evt.assetId) &&
      (evt.type === 'SENSITIVE_FILE_OPENED' ||
        evt.type === 'HONEYTOKEN_VIEWED' ||
        evt.type === 'FAKE_CREDENTIAL_USED')
    ) {
      seenAssets.add(evt.assetId);
      const asset = findAsset(session, evt.assetId);
      if (asset) {
        triggeredDecoys.push({
          assetId: asset.id,
          assetLabel: asset.label,
          honeytokenId: asset.honeytokenId,
          nodeId: asset.nodeId,
          touchedAt: evt.timestamp,
        });
      }
    }
  }

  let classification = 'Simulated baseline — no decoy interaction';
  if (score >= 75) {
    classification = 'Simulated critical — decoy interaction recorded';
  } else if (score >= 40) {
    classification = 'Simulated high — suspicious movement or decoy access';
  } else if (score >= 15) {
    classification = 'Simulated elevated — probing recorded';
  }

  const adaptiveDeployments: AdaptiveDeploymentRecord[] = deriveDecoyDeployments(session)
    .filter((item) => item.origin === 'adaptive' && item.policyId && item.eventId)
    .map((item) => ({
      assetId: item.assetId,
      assetLabel: item.assetLabel,
      nodeId: item.nodeId,
      honeytokenId: item.honeytokenId,
      kind: item.kind,
      policyId: item.policyId as string,
      reason: item.reason,
      deployedAt: item.deployedAt,
      eventId: item.eventId as string,
    }));

  const recommendations: string[] = [
    'Treat this dossier as a simulation record. It does not isolate a live host or revoke a real credential.',
  ];
  if (alertCounts.critical > 0 || alertCounts.high > 0) {
    recommendations.push(
      'Review every touched decoy and the hosts listed in the trajectory before reusing those names in a real environment.',
      'If this scenario were production telemetry, contain the affected segment and rotate any real secret that shared a name with a touched decoy.'
    );
  }
  if (adaptiveDeployments.length > 0) {
    recommendations.push(
      'Inspect adaptive decoys staged during the session and remove any that were opened.'
    );
  }
  if (alertCounts.critical === 0 && alertCounts.high === 0) {
    recommendations.push('No decoy interaction is recorded. Baseline assets remain unopened.');
  }

  const firstEventTime = session.events[0]?.timestamp || session.startedAt;
  const lastEventTime =
    session.events[session.events.length - 1]?.timestamp || session.startedAt;
  const durationSeconds = Math.max(
    0,
    Math.round(
      (new Date(lastEventTime).getTime() - new Date(firstEventTime).getTime()) / 1000
    )
  );

  const mitreMappings = session.events
    .map((event) => mitreForEvent(event))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const unmappedEvents = session.events
    .filter((event) => !mitreForEvent(event))
    .map((event) => unmappedReason(event));

  const recorded = context?.recordedEventCount ?? session.events.length;
  const viewingPartial =
    context?.viewingIndex !== undefined &&
    context.viewingIndex !== null &&
    session.events.length < recorded;

  return {
    sessionId: session.id,
    generatedAt: lastEventTime,
    startedAt: session.startedAt,
    durationSeconds,
    threatScore: score,
    classification,
    summary: `Simulated session '${session.id}' includes ${session.events.length} recorded events across ${path.visitedNodeIds.size} hosts. ${alerts.length} alerts were derived from those events. Threat score ${score}/100. ${SIMULATION_SCOPE_NOTE}`,
    currentNode: session.currentNodeId,
    totalEvents: session.events.length,
    alertCounts,
    attackTrajectory: path.pathNodes,
    triggeredDecoys,
    timeline: [...session.events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ),
    alerts,
    recommendations,
    scopeNotice: SIMULATION_SCOPE_NOTE,
    scoreBreakdown: deriveScoreBreakdown(session),
    mitreMappings,
    unmappedEvents,
    adaptiveDeployments,
    replayView: viewingPartial
      ? {
          eventIndex: context?.viewingIndex ?? session.events.length - 1,
          eventsIncluded: session.events.length,
          eventsRecorded: recorded,
          note: 'This export matches the replay cursor. It is a prefix of the recorded event log, not a separate dataset.',
        }
      : null,
  };
}
