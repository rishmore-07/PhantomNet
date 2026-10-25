import { NodeId, SimulationSession } from './types';

/**
 * Projects the recorded event log to a cursor. Views must use this prefix
 * rather than a parallel animation timeline.
 */
export function projectSessionAt(session: SimulationSession, index: number): SimulationSession {
  if (session.events.length === 0) return session;
  const clamped = Math.max(0, Math.min(index, session.events.length - 1));
  const events = session.events.slice(0, clamped + 1);
  let currentNodeId: NodeId = 'gateway';
  for (const event of events) {
    if (event.type === 'LATERAL_MOVE_ATTEMPT' && event.targetNodeId) {
      currentNodeId = event.targetNodeId;
    }
  }
  return {
    id: session.id,
    startedAt: session.startedAt,
    currentNodeId,
    events,
  };
}

export function sessionSignature(session: SimulationSession) {
  return {
    currentNodeId: session.currentNodeId,
    events: session.events.map((event) => ({
      type: event.type,
      actor: event.actor,
      sourceNodeId: event.sourceNodeId,
      targetNodeId: event.targetNodeId,
      assetId: event.assetId ?? null,
      policyId: event.policyId ?? null,
      deploymentReason: event.deploymentReason ?? null,
      scoreDelta: event.scoreDelta,
      severity: event.severity,
      honeytokenId: event.honeytokenId ?? null,
    })),
  };
}
