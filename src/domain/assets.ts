import { ADAPTIVE_TEMPLATES, templateById } from '../data/adaptiveDecoys';
import { INITIAL_DECOYS } from '../data/decoysSeed';
import { DecoyAsset, NodeId, SimulationSession } from './types';

export function honeytokenForAsset(assetId: string | undefined): string | undefined {
  if (!assetId) return undefined;
  const seeded = INITIAL_DECOYS.find((asset) => asset.id === assetId);
  if (seeded) return seeded.honeytokenId;
  return templateById(assetId)?.honeytokenId;
}

/**
 * Assets an observer can list: baseline decoys plus adaptive decoys
 * whose DECOY_DEPLOYED event is already in the session.
 */
export function listVisibleAssets(session: SimulationSession): DecoyAsset[] {
  const adaptive: DecoyAsset[] = [];
  for (const event of session.events) {
    if (event.type !== 'DECOY_DEPLOYED' || !event.assetId || !event.targetNodeId) continue;
    const template = templateById(event.assetId);
    if (!template) continue;
    adaptive.push({
      id: template.id,
      nodeId: event.targetNodeId,
      kind: template.kind,
      label: template.label,
      honeytokenId: template.honeytokenId,
      preview: template.preview,
      isHoneytoken: true,
      metadata: {
        ...template.metadata,
        origin: 'adaptive',
        policyId: event.policyId || template.policyId,
      },
    });
  }
  return [...INITIAL_DECOYS, ...adaptive];
}

export function findAsset(session: SimulationSession, assetId: string): DecoyAsset | undefined {
  return listVisibleAssets(session).find((asset) => asset.id === assetId);
}

export function assetsOnNode(session: SimulationSession, nodeId: NodeId): DecoyAsset[] {
  return listVisibleAssets(session).filter((asset) => asset.nodeId === nodeId);
}

export function isAdaptiveAssetId(assetId: string): boolean {
  return ADAPTIVE_TEMPLATES.some((template) => template.id === assetId);
}

export function interactionForAsset(asset: DecoyAsset): {
  type: 'SENSITIVE_FILE_OPENED' | 'HONEYTOKEN_VIEWED' | 'LOGIN_FAILED';
  targetNodeId: NodeId;
  assetId: string;
} {
  if (asset.kind === 'file') {
    return { type: 'SENSITIVE_FILE_OPENED', targetNodeId: asset.nodeId, assetId: asset.id };
  }
  if (asset.kind === 'credential') {
    return { type: 'HONEYTOKEN_VIEWED', targetNodeId: asset.nodeId, assetId: asset.id };
  }
  return { type: 'LOGIN_FAILED', targetNodeId: asset.nodeId, assetId: asset.id };
}
