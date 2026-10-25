import { templateByPolicy } from '../data/adaptiveDecoys';
import { IntrusionEvent, NodeId } from './types';

export interface AdaptiveDecision {
  policyId: string;
  assetId: string;
  nodeId: NodeId;
  assetLabel: string;
  reason: string;
}

const RESTRICTED: NodeId[] = ['finance', 'database', 'decoy-vault'];

function latest(events: IntrusionEvent[]): IntrusionEvent | undefined {
  return events[events.length - 1];
}

function policyRepeatedRecon(events: IntrusionEvent[]): AdaptiveDecision | null {
  const event = latest(events);
  if (!event || event.type !== 'SCAN_HOST' || !event.targetNodeId) return null;
  const scans = events.filter((item) => item.type === 'SCAN_HOST');
  if (scans.length < 2) return null;
  const template = templateByPolicy('policy-repeated-recon');
  if (!template) return null;
  return {
    policyId: template.policyId,
    assetId: template.id,
    nodeId: event.targetNodeId,
    assetLabel: template.label,
    reason: `Two simulated host scans were recorded. The later scan targeted ${event.targetNodeId}, so ${template.label} was staged on that host.`,
  };
}

function policyRestrictedSegment(events: IntrusionEvent[]): AdaptiveDecision | null {
  const event = latest(events);
  if (!event || event.type !== 'LATERAL_MOVE_ATTEMPT' || !event.targetNodeId) return null;
  if (!RESTRICTED.includes(event.targetNodeId)) return null;
  const pivots = events.filter((item) => item.type === 'LATERAL_MOVE_ATTEMPT');
  if (pivots.length < 2) return null;
  const template = templateByPolicy('policy-restricted-segment');
  if (!template) return null;
  return {
    policyId: template.policyId,
    assetId: template.id,
    nodeId: event.targetNodeId,
    assetLabel: template.label,
    reason: `Two simulated lateral moves were recorded, and the later move entered ${event.targetNodeId}. ${template.label} was staged on that host to match interest in the restricted segment.`,
  };
}

function policyFinanceCredential(events: IntrusionEvent[]): AdaptiveDecision | null {
  const event = latest(events);
  if (!event || event.type !== 'SENSITIVE_FILE_OPENED') return null;
  const onFinance = event.targetNodeId === 'finance' || event.assetId === 'asset-payroll-file';
  if (!onFinance) return null;
  const template = templateByPolicy('policy-finance-credential');
  if (!template) return null;
  return {
    policyId: template.policyId,
    assetId: template.id,
    nodeId: 'database',
    assetLabel: template.label,
    reason: `A simulated sensitive file was opened on the finance host. ${template.label} was staged on the adjacent database host to match document access with a data-store credential.`,
  };
}

function policyCredentialFollow(events: IntrusionEvent[]): AdaptiveDecision | null {
  const event = latest(events);
  if (!event || event.type !== 'HONEYTOKEN_VIEWED' || !event.targetNodeId) return null;
  const template = templateByPolicy('policy-credential-follow');
  if (!template) return null;
  const fromVault =
    event.targetNodeId === 'decoy-vault' || event.assetId === 'asset-admin-token';
  const nodeId: NodeId = fromVault ? 'database' : event.targetNodeId;
  const context = fromVault
    ? 'The viewed credential referenced database access, so the runbook was staged on the database host.'
    : `The credential was viewed on ${event.targetNodeId}, so the runbook was staged on that host.`;
  return {
    policyId: template.policyId,
    assetId: template.id,
    nodeId,
    assetLabel: template.label,
    reason: `A simulated credential was viewed. ${context}`,
  };
}

function policyAuthSpray(events: IntrusionEvent[]): AdaptiveDecision | null {
  const event = latest(events);
  if (!event || event.type !== 'LOGIN_FAILED' || !event.targetNodeId) return null;
  const nodeId = event.targetNodeId;
  const failures = events.filter(
    (item) => item.type === 'LOGIN_FAILED' && item.targetNodeId === nodeId
  );
  if (failures.length < 2) return null;
  const template = templateByPolicy('policy-auth-spray');
  if (!template) return null;
  return {
    policyId: template.policyId,
    assetId: template.id,
    nodeId,
    assetLabel: template.label,
    reason: `Two simulated login failures were recorded on ${nodeId}. ${template.label} was staged on that host to match repeated authentication attempts.`,
  };
}

const POLICIES = [
  policyRepeatedRecon,
  policyRestrictedSegment,
  policyFinanceCredential,
  policyCredentialFollow,
  policyAuthSpray,
];

/**
 * Pure selection. The same event list always yields the same decisions.
 * Each policy deploys at most once, and only in response to the latest event.
 */
export function planAdaptiveDeployments(events: IntrusionEvent[]): AdaptiveDecision[] {
  const deployedPolicies = new Set(
    events.filter((event) => event.type === 'DECOY_DEPLOYED' && event.policyId).map((event) => event.policyId as string)
  );
  const deployedAssets = new Set(
    events.filter((event) => event.type === 'DECOY_DEPLOYED' && event.assetId).map((event) => event.assetId as string)
  );

  const decisions: AdaptiveDecision[] = [];
  for (const policy of POLICIES) {
    const decision = policy(events);
    if (!decision) continue;
    if (deployedPolicies.has(decision.policyId) || deployedAssets.has(decision.assetId)) continue;
    decisions.push(decision);
    deployedPolicies.add(decision.policyId);
    deployedAssets.add(decision.assetId);
  }
  return decisions;
}
