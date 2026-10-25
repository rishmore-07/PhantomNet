import { honeytokenForAsset } from './assets';
import { EventType, Severity, Alert, IntrusionEvent, NodeId } from './types';

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
      `Unauthorized login probe rejected on node ${evt.targetNodeId}. Invalid credentials submitted to monitored endpoint.`,
  },
  SENSITIVE_FILE_OPENED: {
    type: 'SENSITIVE_FILE_OPENED',
    baseSeverity: 'high',
    scoreDelta: 35,
    triggersAlert: true,
    alertTitle: (evt) => `Decoy Sensitive Document Accessed: ${evt.assetLabel || 'Restricted File'}`,
    generateEvidence: (evt) =>
      `Honeytoken beacon triggered: Document '${evt.assetLabel}' opened on ${evt.targetNodeId}. Asset contains canary watermark.`,
  },
  HONEYTOKEN_VIEWED: {
    type: 'HONEYTOKEN_VIEWED',
    baseSeverity: 'high',
    scoreDelta: 40,
    triggersAlert: true,
    alertTitle: (evt) => `Honeytoken Credential Inspected: ${evt.assetLabel || 'Synthetic Secret'}`,
    generateEvidence: (evt) =>
      `Canary secret '${evt.assetLabel}' viewed. High-interaction trap tripwire tripped with immediate telemetry beacon.`,
  },
  FAKE_CREDENTIAL_USED: {
    type: 'FAKE_CREDENTIAL_USED',
    baseSeverity: 'critical',
    scoreDelta: 50,
    triggersAlert: true,
    alertTitle: (evt) => `CRITICAL: Synthetic Credential Replay on ${evt.targetNodeId}`,
    generateEvidence: (evt) =>
      `Attacker submitted synthetic canary token to gain unauthorized access on ${evt.targetNodeId}. Zero legitimate usage possible.`,
  },
  LATERAL_MOVE_ATTEMPT: {
    type: 'LATERAL_MOVE_ATTEMPT',
    baseSeverity: 'high',
    scoreDelta: 25,
    triggersAlert: true,
    alertTitle: (evt) => `Lateral Movement: ${evt.sourceNodeId} ➔ ${evt.targetNodeId}`,
    generateEvidence: (evt) =>
      `Simulated lateral move from ${evt.sourceNodeId} to ${evt.targetNodeId} along an allowed network edge.`,
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

/**
 * Calculates deterministic threat score capped at 100
 */
export function calculateThreatScore(events: IntrusionEvent[]): number {
  const total = events.reduce((sum, e) => sum + (e.scoreDelta || 0), 0);
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
