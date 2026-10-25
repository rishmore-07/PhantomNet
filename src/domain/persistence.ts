import { ActionOutcome, EventType, NodeId, SimulationSession } from './types';
import { projectSessionAt } from './replay';

export const STORAGE_KEY = 'phantomnet_session_v2';
export const LEGACY_STORAGE_KEY = 'phantomnet_session_v1';

const NODE_IDS: NodeId[] = ['gateway', 'web', 'workstation', 'finance', 'database', 'decoy-vault'];

const OUTCOMES: ActionOutcome[] = ['attempted', 'blocked', 'succeeded'];

const EVENT_TYPES: EventType[] = [
  'SESSION_STARTED',
  'SCAN_HOST',
  'BROWSE_DIRECTORY',
  'LOGIN_FAILED',
  'SENSITIVE_FILE_OPENED',
  'HONEYTOKEN_VIEWED',
  'FAKE_CREDENTIAL_USED',
  'LATERAL_MOVE_ATTEMPT',
  'DECOY_DEPLOYED',
];

function isNodeId(value: unknown): value is NodeId {
  return typeof value === 'string' && NODE_IDS.includes(value as NodeId);
}

function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && EVENT_TYPES.includes(value as EventType);
}

/**
 * Accepts a previously stored session. Unknown event types are dropped.
 * Returns null when the payload cannot be shown safely.
 */
export function sanitizeSession(input: unknown): SimulationSession | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<SimulationSession>;
  if (typeof raw.id !== 'string' || typeof raw.startedAt !== 'string') return null;
  if (!Array.isArray(raw.events) || raw.events.length === 0) return null;

  const events = raw.events.filter((event) => {
    if (!event || typeof event !== 'object') return false;
    if (typeof event.id !== 'string' || typeof event.timestamp !== 'string') return false;
    if (!isEventType(event.type)) return false;
    if (event.actor !== 'simulated-attacker' && event.actor !== 'system') return false;
    if (typeof event.severity !== 'string') return false;
    return true;
  });

  if (events.length === 0 || events[0].type !== 'SESSION_STARTED') return null;

  const draft: SimulationSession = {
    id: raw.id,
    startedAt: raw.startedAt,
    currentNodeId: isNodeId(raw.currentNodeId) ? raw.currentNodeId : 'gateway',
    events: events.map((event) => ({
      ...event,
      scoreDelta: typeof event.scoreDelta === 'number' ? event.scoreDelta : 0,
      explanation: typeof event.explanation === 'string' ? event.explanation : '',
      outcome: OUTCOMES.includes(event.outcome as ActionOutcome) ? (event.outcome as ActionOutcome) : undefined,
    })),
  };

  return projectSessionAt(draft, draft.events.length - 1);
}
