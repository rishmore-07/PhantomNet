import {
  ActionOutcome,
  EventType,
  IntrusionEvent,
  NodeId,
  SimulationSession,
} from './types';
import { awardScore, THREAT_RULES } from './rules';
import { getAllowedTransitions } from '../data/networkSeed';
import { findAsset, isAdaptiveAssetId } from './assets';
import { planAdaptiveDeployments } from './adaptive';
import { templateById } from '../data/adaptiveDecoys';

export interface PerformActionParams {
  type: EventType;
  targetNodeId?: NodeId;
  assetId?: string;
  customExplanation?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  event?: IntrusionEvent;
  updatedSession: SimulationSession;
  /** Set when a lateral action was recorded, including blocked and unsuccessful attempts. */
  outcome?: ActionOutcome;
}

const RESTRICTED_HOSTS: NodeId[] = ['finance', 'database', 'decoy-vault'];

export function classifyLateralMove(
  session: SimulationSession,
  targetNodeId: NodeId | undefined
): { ok: true; outcome: ActionOutcome; detail: string } | { ok: false; reason: string } {
  if (!targetNodeId) {
    return { ok: false, reason: 'Target host must be specified for a lateral move.' };
  }
  if (targetNodeId === session.currentNodeId) {
    return { ok: false, reason: `The simulated session is already on ${session.currentNodeId}.` };
  }
  const allowedHops = getAllowedTransitions(session.currentNodeId);
  if (!allowedHops.includes(targetNodeId)) {
    return {
      ok: true,
      outcome: 'blocked',
      detail: `No adjacent route from ${session.currentNodeId} to ${targetNodeId}. The simulated session stayed on ${session.currentNodeId}.`,
    };
  }
  if (RESTRICTED_HOSTS.includes(targetNodeId)) {
    const alreadyAttempted = session.events.some(
      (event) =>
        event.type === 'LATERAL_MOVE_ATTEMPT' &&
        event.outcome === 'attempted' &&
        event.sourceNodeId === session.currentNodeId &&
        event.targetNodeId === targetNodeId
    );
    if (!alreadyAttempted) {
      return {
        ok: true,
        outcome: 'attempted',
        detail: `Access to restricted host ${targetNodeId} was attempted from ${session.currentNodeId}. The simulated session did not relocate.`,
      };
    }
    return {
      ok: true,
      outcome: 'succeeded',
      detail: `Simulated session followed the allowed edge from ${session.currentNodeId} to ${targetNodeId} after an earlier attempt. This relocates the session. It does not record a host compromise.`,
    };
  }
  return {
    ok: true,
    outcome: 'succeeded',
    detail: `Simulated session followed an allowed edge from ${session.currentNodeId} to ${targetNodeId}. This records a location change, not a compromise.`,
  };
}

export function lateralControlLabel(
  events: IntrusionEvent[],
  currentNodeId: NodeId,
  targetNodeId: NodeId
): string {
  if (targetNodeId === currentNodeId) return 'Current host';
  const open = getAllowedTransitions(currentNodeId).includes(targetNodeId);
  if (!open) {
    const seen = events.some(
      (event) =>
        event.outcome === 'blocked' &&
        event.sourceNodeId === currentNodeId &&
        event.targetNodeId === targetNodeId
    );
    return seen ? 'Route already blocked' : 'Probe blocked route';
  }
  if (RESTRICTED_HOSTS.includes(targetNodeId)) {
    const pending = events.some(
      (event) =>
        event.type === 'LATERAL_MOVE_ATTEMPT' &&
        event.outcome === 'attempted' &&
        event.sourceNodeId === currentNodeId &&
        event.targetNodeId === targetNodeId
    );
    return pending ? 'Enter after attempt' : 'Attempt access';
  }
  return 'Follow route';
}

let eventCounter = 1;

export function generateEventId(): string {
  const time = Date.now().toString(36);
  const count = (eventCounter++).toString().padStart(4, '0');
  return `evt-${time}-${count}`;
}

export function createInitialSession(): SimulationSession {
  const startedAt = new Date().toISOString();
  const initialEvent: IntrusionEvent = {
    id: generateEventId(),
    sessionId: `sess-${Date.now().toString(36)}`,
    timestamp: startedAt,
    type: 'SESSION_STARTED',
    actor: 'simulated-attacker',
    sourceNodeId: 'gateway',
    targetNodeId: 'gateway',
    severity: 'info',
    scoreDelta: 0,
    explanation: 'Simulated attacker established connection to Perimeter Gateway (192.0.2.10).',
    evidence: 'Inbound TLS session initiated from external source to monitored ingress portal.',
  };

  return {
    id: initialEvent.sessionId,
    startedAt,
    currentNodeId: 'gateway',
    events: [initialEvent],
  };
}

/**
 * Validates whether an action is permissible from the current simulation state.
 */
export function validateAction(
  session: SimulationSession,
  params: PerformActionParams
): { valid: boolean; reason?: string } {
  const { currentNodeId } = session;

  // 1. Lateral move validation: Target must be adjacent in the network graph
  if (params.type === 'LATERAL_MOVE_ATTEMPT') {
    if (!params.targetNodeId) {
      return { valid: false, reason: 'Target host must be specified for lateral move.' };
    }
    if (params.targetNodeId === currentNodeId) {
      return { valid: false, reason: `Attacker is already resident on ${currentNodeId}.` };
    }
    const allowedHops = getAllowedTransitions(currentNodeId);
    if (!allowedHops.includes(params.targetNodeId)) {
      return {
        valid: false,
        reason: `Direct lateral pivot from ${currentNodeId} to ${params.targetNodeId} is blocked by network routing segmentation. Valid next hops: [${allowedHops.join(', ')}].`,
      };
    }
  }

  if (params.type === 'DECOY_DEPLOYED') {
    return {
      valid: false,
      reason: 'Decoy deployment is issued only by the deception policy engine.',
    };
  }

  // Asset interaction: the asset must exist in the visible environment and
  // the simulated session must already be on the host that holds it.
  if (
    params.assetId &&
    (params.type === 'SENSITIVE_FILE_OPENED' ||
      params.type === 'HONEYTOKEN_VIEWED' ||
      params.type === 'BROWSE_DIRECTORY' ||
      params.type === 'LOGIN_FAILED' ||
      params.type === 'FAKE_CREDENTIAL_USED')
  ) {
    const asset = findAsset(session, params.assetId);
    if (!asset) {
      const pending = isAdaptiveAssetId(params.assetId) ? templateById(params.assetId) : undefined;
      return {
        valid: false,
        reason: pending
          ? `Asset '${pending.label}' is not present on this host.`
          : `Unknown asset '${params.assetId}'.`,
      };
    }
    if (asset.nodeId !== currentNodeId) {
      return {
        valid: false,
        reason: `Cannot interact with '${asset.label}' on '${asset.nodeId}' while the simulated session is on '${currentNodeId}'. Relocate the session to '${asset.nodeId}' first.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Records a simulated attacker action on the append-only session log.
 * A lateral attempt updates the session location only when the outcome is succeeded.
 */
export function appendSimulationEvent(
  session: SimulationSession,
  params: PerformActionParams
): ActionResult {
  let lateral: ReturnType<typeof classifyLateralMove> | null = null;
  if (params.type === 'LATERAL_MOVE_ATTEMPT') {
    lateral = classifyLateralMove(session, params.targetNodeId);
    if (!lateral.ok) {
      return {
        success: false,
        message: lateral.reason,
        updatedSession: session,
      };
    }
  } else {
    const validation = validateAction(session, params);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.reason || 'Action rejected by simulation engine.',
        updatedSession: session,
      };
    }
  }

  const rule = THREAT_RULES[params.type];
  const now = new Date().toISOString();
  const sourceNode = session.currentNodeId;
  const targetNode = params.targetNodeId || session.currentNodeId;
  const moveOutcome = lateral && lateral.ok ? lateral.outcome : undefined;
  const awarded = awardScore(session.events, params.type, moveOutcome, targetNode, params.assetId);

  let assetLabel: string | undefined;
  let honeytokenId: string | undefined;
  if (params.assetId) {
    const asset = findAsset(session, params.assetId);
    if (asset) {
      assetLabel = asset.label;
      honeytokenId = asset.honeytokenId;
    }
  }

  const nextCurrentNode =
    moveOutcome === 'succeeded' && params.targetNodeId ? params.targetNodeId : session.currentNodeId;

  const newEvent: IntrusionEvent = {
    id: generateEventId(),
    sessionId: session.id,
    timestamp: now,
    type: params.type,
    actor: 'simulated-attacker',
    sourceNodeId: sourceNode,
    targetNodeId: targetNode,
    assetId: params.assetId,
    assetLabel,
    severity: awarded.severity,
    scoreDelta: awarded.delta,
    honeytokenId,
    outcome: moveOutcome,
    explanation:
      params.customExplanation ||
      (lateral && lateral.ok
        ? lateral.detail
        : params.type === 'SENSITIVE_FILE_OPENED'
        ? `Synthetic file '${assetLabel || 'document'}' opened on ${targetNode}.`
        : params.type === 'HONEYTOKEN_VIEWED'
        ? `Synthetic credential '${assetLabel || 'secret'}' read on ${targetNode}.`
        : params.type === 'FAKE_CREDENTIAL_USED'
        ? `Synthetic credential presented to ${targetNode}. No real account was used.`
        : params.type === 'LOGIN_FAILED'
        ? `Simulated login rejected on ${targetNode}.`
        : params.type === 'SCAN_HOST'
        ? `Simulated port scan of ${targetNode}.`
        : `Directory listing on ${targetNode}.`),
    evidence: rule.generateEvidence({
      sourceNodeId: sourceNode,
      targetNodeId: targetNode,
      assetId: params.assetId,
      assetLabel,
      outcome: moveOutcome,
    }),
  };

  const events = [...session.events, newEvent];
  const decisions = planAdaptiveDeployments(events);
  const triggerTime = new Date(newEvent.timestamp).getTime();
  decisions.forEach((decision, index) => {
    const template = templateById(decision.assetId);
    events.push({
      id: generateEventId(),
      sessionId: session.id,
      timestamp: new Date(triggerTime + index + 1).toISOString(),
      type: 'DECOY_DEPLOYED',
      actor: 'system',
      sourceNodeId: nextCurrentNode,
      targetNodeId: decision.nodeId,
      assetId: decision.assetId,
      assetLabel: decision.assetLabel,
      honeytokenId: template?.honeytokenId,
      policyId: decision.policyId,
      deploymentReason: decision.reason,
      severity: 'info',
      scoreDelta: 0,
      explanation: decision.reason,
      evidence: `Policy ${decision.policyId} staged ${decision.assetLabel} on ${decision.nodeId} after ${newEvent.type}. Simulated deployment only.`,
    });
  });

  const updatedSession: SimulationSession = {
    ...session,
    currentNodeId: nextCurrentNode,
    events,
  };

  const recorded =
    moveOutcome === 'blocked'
      ? lateral && lateral.ok
        ? lateral.detail
        : 'Route blocked. The simulated session was not relocated.'
      : moveOutcome === 'attempted'
        ? lateral && lateral.ok
          ? lateral.detail
          : 'Access attempted. The simulated session was not relocated.'
        : `Recorded ${params.type}.`;

  return {
    success: moveOutcome !== 'blocked',
    outcome: moveOutcome,
    message: recorded,
    event: newEvent,
    updatedSession,
  };
}
