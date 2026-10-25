import { honeytokenForAsset } from './assets';
import { ActionOutcome, EventType, Severity, Alert, IntrusionEvent, NodeId } from './types';

export interface ThreatRule {
  type: EventType;
  baseSeverity: Severity;
  scoreDelta: number;
  triggersAlert: boolean;
  alertTitle: (event: Partial<IntrusionEvent>) => string;
  generateEvidence: (event: Partial<IntrusionEvent>) => string;
}

export const THREAT_RULES: Record<EventType, ThreatRule> = {
  SESSION_STARTED: {
    type: 'SESSION_STARTED',
    baseSeverity: 'info',
    scoreDelta: 0,
    triggersAlert: false,
    alertTitle: () => 'Session Initialized',
    generateEvidence: () => 'Attacker ingress session established at entry node.',
  },
  SCAN_HOST: {
    type: 'SCAN_HOST',
    baseSeverity: 'info',
    scoreDelta: 5,
    triggersAlert: false,
    alertTitle: (evt) => `Port & Service Recon on ${evt.targetNodeId}`,
    generateEvidence: (evt) =>
      `Port scan probe detected against ${evt.targetNodeId} targeting common services (22, 80, 443, 5432, 8200).`,
  },
  BROWSE_DIRECTORY: {
    type: 'BROWSE_DIRECTORY',
    baseSeverity: 'info',
    scoreDelta: 0,
    triggersAlert: false,
    alertTitle: (evt) => `Directory Enumeration on ${evt.targetNodeId}`,
    generateEvidence: (evt) =>
      `File listing query issued on ${evt.targetNodeId}. Directory traversal inspected synthetic tree.`,
  },
  LOGIN_FAILED: {
    type: 'LOGIN_FAILED',
    baseSeverity: 'low',
    scoreDelta: 10,
    triggersAlert: true,
    alertTitle: (evt) => `Failed Authentication Attempt on ${evt.targetNodeId}`,
    generateEvidence: (evt) =>
      `Simulated login rejected on ${evt.targetNodeId}. No real authentication service was contacted.`,
  },
  SENSITIVE_FILE_OPENED: {
    type: 'SENSITIVE_FILE_OPENED',
    baseSeverity: 'high',
    scoreDelta: 35,
    triggersAlert: true,
    alertTitle: (evt) => `Decoy file opened: ${evt.assetLabel || 'synthetic document'}`,
    generateEvidence: (evt) =>
      `The simulation recorded an open of synthetic document '${evt.assetLabel}' on ${evt.targetNodeId}.`,
  },
  HONEYTOKEN_VIEWED: {
    type: 'HONEYTOKEN_VIEWED',
    baseSeverity: 'high',
    scoreDelta: 40,
    triggersAlert: true,
    alertTitle: (evt) => `Synthetic credential viewed: ${evt.assetLabel || 'honeytoken'}`,
    generateEvidence: (evt) =>
      `The simulation recorded a view of synthetic credential '${evt.assetLabel}' on ${evt.targetNodeId}.`,
  },
  FAKE_CREDENTIAL_USED: {
    type: 'FAKE_CREDENTIAL_USED',
    baseSeverity: 'critical',
    scoreDelta: 45,
    triggersAlert: true,
    alertTitle: (evt) => `Synthetic credential presented on ${evt.targetNodeId}`,
    generateEvidence: (evt) =>
      `The simulation recorded a synthetic credential presented to ${evt.targetNodeId}. No real account was used.`,
  },
  LATERAL_MOVE_ATTEMPT: {
    type: 'LATERAL_MOVE_ATTEMPT',
    baseSeverity: 'medium',
    scoreDelta: 8,
    triggersAlert: true,
    alertTitle: (evt) => {
      if (evt.outcome === 'blocked') return `Route blocked: ${evt.sourceNodeId} → ${evt.targetNodeId}`;
      if (evt.outcome === 'attempted') return `Access attempted: ${evt.sourceNodeId} → ${evt.targetNodeId}`;
      return `Simulated session moved: ${evt.sourceNodeId} → ${evt.targetNodeId}`;
    },
    generateEvidence: (evt) => {
      if (evt.outcome === 'blocked') {
        return `No adjacent route from ${evt.sourceNodeId} to ${evt.targetNodeId}. The simulated session was not relocated.`;
      }
      if (evt.outcome === 'attempted') {
        return `Access from ${evt.sourceNodeId} to restricted host ${evt.targetNodeId} was attempted. The session stayed on ${evt.sourceNodeId}.`;
      }
      return `The simulated session followed an allowed edge from ${evt.sourceNodeId} to ${evt.targetNodeId}. This is a location change inside the simulation, not a recorded compromise.`;
    },
  },
  DECOY_DEPLOYED: {
    type: 'DECOY_DEPLOYED',
    baseSeverity: 'info',
    scoreDelta: 0,
    triggersAlert: false,
    alertTitle: (evt) => `Decoy staged: ${evt.assetLabel || 'asset'}`,
    generateEvidence: (evt) =>
      evt.evidence ||
      `Adaptive policy staged ${evt.assetLabel || 'a decoy'} on ${evt.targetNodeId}.`,
  },
};

/**
 * Deterministically evaluate an event and produce an Alert if rule triggers
 */
export function evaluateEventAlert(event: IntrusionEvent): Alert | null {
  const rule = THREAT_RULES[event.type];
  if (!rule || !rule.triggersAlert) {
    return null;
  }

  return {
    id: `alert-${event.id}`,
    eventId: event.id,
    timestamp: event.timestamp,
    severity: event.severity,
    title: rule.alertTitle(event),
    nodeId: (event.targetNodeId || event.sourceNodeId || 'gateway') as NodeId,
    assetId: event.assetId,
    honeytokenId: event.honeytokenId || honeytokenForAsset(event.assetId),
    evidence: event.evidence || rule.generateEvidence(event),
    description: event.explanation,
  };
}

const RECON_CAP = 12;
const AUTH_CAP = 12;
const MOVE_CAP = 24;

type ScoreCategory = 'recon' | 'auth' | 'move';

function categoryOf(event: Pick<IntrusionEvent, 'type'>): ScoreCategory | null {
  if (event.type === 'SCAN_HOST' || event.type === 'BROWSE_DIRECTORY') return 'recon';
  if (event.type === 'LOGIN_FAILED') return 'auth';
  if (event.type === 'LATERAL_MOVE_ATTEMPT') return 'move';
  return null;
}

function spent(prior: IntrusionEvent[], category: ScoreCategory): number {
  return prior.reduce((sum, event) => sum + (categoryOf(event) === category ? event.scoreDelta : 0), 0);
}

function clamp(prior: IntrusionEvent[], category: ScoreCategory | null, raw: number): number {
  if (raw <= 0) return 0;
  if (!category) return raw;
  const caps: Record<ScoreCategory, number> = { recon: RECON_CAP, auth: AUTH_CAP, move: MOVE_CAP };
  return Math.max(0, Math.min(raw, caps[category] - spent(prior, category)));
}

/**
 * Points awarded for one new event, given the events already recorded.
 * Repeated low-signal actions and each weak category are capped.
 * Decoy file, honeytoken, and synthetic-credential events keep high weight
 * and are counted once per asset.
 */
export function awardScore(
  prior: IntrusionEvent[],
  type: EventType,
  outcome: ActionOutcome | undefined,
  targetNodeId?: NodeId,
  assetId?: string
): { delta: number; severity: Severity } {
  if (type === 'SCAN_HOST') {
    const seen = prior.some((event) => event.type === 'SCAN_HOST' && event.targetNodeId === targetNodeId);
    return { delta: clamp(prior, 'recon', seen ? 0 : 4), severity: 'info' };
  }
  if (type === 'BROWSE_DIRECTORY') return { delta: 0, severity: 'info' };
  if (type === 'LOGIN_FAILED') {
    const count = prior.filter(
      (event) => event.type === 'LOGIN_FAILED' && event.targetNodeId === targetNodeId
    ).length;
    const raw = count === 0 ? 8 : count === 1 ? 4 : 0;
    return { delta: clamp(prior, 'auth', raw), severity: 'low' };
  }
  if (type === 'LATERAL_MOVE_ATTEMPT') {
    const raw = outcome === 'blocked' ? 2 : outcome === 'attempted' ? 6 : 8;
    const severity: Severity = outcome === 'blocked' ? 'low' : 'medium';
    return { delta: clamp(prior, 'move', raw), severity };
  }
  if (type === 'SENSITIVE_FILE_OPENED') {
    const seen = assetId
      ? prior.some((event) => event.type === type && event.assetId === assetId)
      : false;
    return { delta: seen ? 0 : 35, severity: 'high' };
  }
  if (type === 'HONEYTOKEN_VIEWED') {
    const seen = assetId
      ? prior.some((event) => event.type === type && event.assetId === assetId)
      : false;
    return { delta: seen ? 0 : 40, severity: 'high' };
  }
  if (type === 'FAKE_CREDENTIAL_USED') {
    const key = assetId || targetNodeId || '';
    const seen = prior.some(
      (event) => event.type === type && (event.assetId || event.targetNodeId || '') === key
    );
    return { delta: seen ? 0 : 45, severity: 'critical' };
  }
  return { delta: 0, severity: type === 'DECOY_DEPLOYED' ? 'info' : 'info' };
}

/**
 * Sum of awarded event deltas, capped at 100.
 */
export function calculateThreatScore(events: IntrusionEvent[]): number {
  const total = events.reduce((sum, event) => sum + (event.scoreDelta || 0), 0);
  return Math.min(100, Math.max(0, total));
}

/**
 * Evaluates threat level category from numerical threat score
 */
export function getThreatLevel(score: number): {
  level: 'NOMINAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  color: string;
  badgeClass: string;
} {
  if (score >= 75) {
    return {
      level: 'CRITICAL',
      color: '#F87171',
      badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
    };
  }
  if (score >= 40) {
    return {
      level: 'HIGH',
      color: '#FBBF24',
      badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    };
  }
  if (score >= 15) {
    return {
      level: 'ELEVATED',
      color: '#FBBF24',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    };
  }
  return {
    level: 'NOMINAL',
      color: '#34D399',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  };
}
