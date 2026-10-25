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
  attemptedEdgeIds: Set<string>;
  blockedEdgeIds: Set<string>;
  steps: AttackPathStep[];
  pathNodes: NodeId[];
} {
  const visitedNodeIds = new Set<NodeId>(['gateway']);
  const traversedEdgeIds = new Set<string>();
  const attemptedEdgeIds = new Set<string>();
  const blockedEdgeIds = new Set<string>();
  const steps: AttackPathStep[] = [];
  const pathNodes: NodeId[] = ['gateway'];

  for (const event of session.events) {
    if (event.type === 'LATERAL_MOVE_ATTEMPT' && event.sourceNodeId && event.targetNodeId) {
      const outcome = event.outcome ?? 'succeeded';
      const edgeId = edgeIdBetween(event.sourceNodeId, event.targetNodeId);
      steps.push({
        fromNodeId: event.sourceNodeId,
        toNodeId: event.targetNodeId,
        timestamp: event.timestamp,
        eventId: event.id,
        type: event.type,
        outcome,
      });
      if (outcome === 'succeeded') {
        visitedNodeIds.add(event.targetNodeId);
        pathNodes.push(event.targetNodeId);
        if (edgeId) traversedEdgeIds.add(edgeId);
      } else if (outcome === 'attempted' && edgeId) {
        attemptedEdgeIds.add(edgeId);
      } else if (outcome === 'blocked' && edgeId) {
        blockedEdgeIds.add(edgeId);
      }
    }
  }

  return {
    visitedNodeIds,
    traversedEdgeIds,
    attemptedEdgeIds,
    blockedEdgeIds,
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
        (evt.type === 'LATERAL_MOVE_ATTEMPT' && evt.outcome !== 'blocked')) &&
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

const SCORE_NOTES: Record<ScoreComponent['eventType'], string> = {
  SESSION_STARTED: 'Session bookkeeping. No points.',
  SCAN_HOST: 'First scan of a host scores 4. Repeats score 0. Reconnaissance is capped at 12.',
  BROWSE_DIRECTORY: 'Directory listing is recorded and does not add points.',
  LOGIN_FAILED: 'First rejection on a host scores 8, the second scores 4, later ones score 0. Authentication is capped at 12.',
  SENSITIVE_FILE_OPENED: 'Each synthetic file scores 35 once.',
  HONEYTOKEN_VIEWED: 'Each synthetic credential view scores 40 once.',
  FAKE_CREDENTIAL_USED: 'Each synthetic credential presentation scores 45 once.',
  LATERAL_MOVE_ATTEMPT: 'Blocked 2, attempted 6, session move 8. Movement is capped at 24 and does not mark a host compromised.',
  DECOY_DEPLOYED: 'Staging a decoy is a defender action and scores 0.',
};

export function deriveScoreBreakdown(session: SimulationSession): ScoreComponent[] {
  const grouped = new Map<
    ScoreComponent['eventType'],
    { count: number; awarded: number; suppressed: number; nonzero: number[] }
  >();
  for (const event of session.events) {
    const current = grouped.get(event.type) || { count: 0, awarded: 0, suppressed: 0, nonzero: [] };
    current.count += 1;
    current.awarded += event.scoreDelta || 0;
    if (!event.scoreDelta) current.suppressed += 1;
    else current.nonzero.push(event.scoreDelta);
    grouped.set(event.type, current);
  }
  return Array.from(grouped.entries())
    .filter(([, value]) => value.awarded > 0)
    .map(([eventType, value]) => ({
      eventType,
      count: value.count,
      deltaEach: value.nonzero.every((delta) => delta === value.nonzero[0]) ? value.nonzero[0] : 0,
      subtotal: value.awarded,
      suppressed: value.suppressed,
      note: SCORE_NOTES[eventType],
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

  const decoyTouched = session.events.some(
    (event) =>
      event.type === 'SENSITIVE_FILE_OPENED' ||
      event.type === 'HONEYTOKEN_VIEWED' ||
      event.type === 'FAKE_CREDENTIAL_USED'
  );
  let classification = 'Simulated baseline — no decoy interaction';
  if (score >= 75 && decoyTouched) {
    classification = 'Simulated critical — decoy interaction recorded';
  } else if (score >= 40) {
    classification = 'Simulated high — probing or decoy access recorded';
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
    summary: `Simulated session '${session.id}' includes ${session.events.length} recorded events. The session relocated across ${path.pathNodes.length} hosts. ${alerts.length} alerts were derived from those events. Threat score ${score}/100. Attempted or blocked moves are not counted as a session relocation. ${SIMULATION_SCOPE_NOTE}`,
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
