import { FileText, Globe, Key, X } from 'lucide-react';
import { DecoyAsset, DecoyDeploymentRecord, NodeId, NodeStatus, SimulationSession } from '../../domain/types';
import { INITIAL_NODES } from '../../data/networkSeed';
import { assetsOnNode, interactionForAsset } from '../../domain/assets';
import { presentHost } from '../../domain/presentation';
import { Perspective } from '../../hooks/useSimulationStore';
import { lateralControlLabel, PerformActionParams } from '../../domain/simulation';

interface NodeDetailsPanelProps {
  session: SimulationSession;
  selectedNodeId: NodeId;
  currentNodeId: NodeId;
  nodeStatuses: Record<NodeId, NodeStatus>;
  deployments: DecoyDeploymentRecord[];
  perspective: Perspective;
  actionsLocked: boolean;
  onClose?: () => void;
  onOpenAssetPreview: (asset: DecoyAsset) => void;
  onPerformAction: (params: PerformActionParams) => void;
}

export function NodeDetailsPanel({
  session,
  selectedNodeId,
  currentNodeId,
  nodeStatuses,
  deployments,
  perspective,
  actionsLocked,
  onClose,
  onOpenAssetPreview,
  onPerformAction,
}: NodeDetailsPanelProps) {
  const nodeDef = INITIAL_NODES.find((node) => node.id === selectedNodeId);
  if (!nodeDef) return null;
  const host = presentHost(nodeDef, perspective);
  const status = nodeStatuses[selectedNodeId];
  const resident = currentNodeId === selectedNodeId;
  const assets = assetsOnNode(session, selectedNodeId);
  const moveLabel = lateralControlLabel(session.events, currentNodeId, selectedNodeId);
  const moveDisabled = resident || actionsLocked || moveLabel === 'Route already blocked';
  const defender = perspective === 'defender';

  return (
    <aside className="h-full overflow-y-auto bg-soc-card border border-soc-border rounded-lg p-3 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] text-soc-text truncate">{host.label}</h3>
          <div className="font-mono text-[11px] text-soc-cyan">{nodeDef.ip}</div>
          <div className="text-[12px] text-soc-textMuted">{host.role}</div>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close inspector" className="text-soc-textDim hover:text-soc-text">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {defender && (
        <div className="text-[12px] rounded-md border border-soc-border bg-soc-bg px-2.5 py-2">
          <span className={status === 'triggered' ? 'text-soc-red' : status === 'suspicious' ? 'text-soc-amber' : 'text-soc-green'}>
            {status === 'triggered' ? 'Decoy touched' : status === 'suspicious' ? 'Suspicious activity' : 'No decoy interaction'}
          </span>
          <p className="text-soc-textDim mt-0.5">Status is derived from the visible event prefix.</p>
        </div>
      )}

      <p className="text-[12px] text-soc-textMuted leading-relaxed">{host.description}</p>

      <dl className="text-[11px] space-y-1 font-mono">
        <div className="flex justify-between gap-3">
          <dt className="text-soc-textDim">System</dt>
          <dd className="text-soc-text text-right">{host.os}</dd>
        </div>
        <div>
          <dt className="text-soc-textDim">Services</dt>
          <dd className="text-soc-textMuted mt-0.5">{host.services.join(' · ')}</dd>
        </div>
      </dl>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="text-[12px] text-soc-text">{defender ? 'Assets on this host' : 'Directory'}</h4>
          <span className="font-mono text-[10px] text-soc-textDim">{assets.length}</span>
        </div>
        {assets.length === 0 ? (
          <p className="text-[12px] text-soc-textDim border border-dashed border-soc-border rounded-md px-2 py-3">
            No files are listed on this host in the current view.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {assets.map((asset) => {
              const staged = deployments.find((item) => item.assetId === asset.id && item.origin === 'adaptive');
              return (
                <li key={asset.id} className="border border-soc-border rounded-md px-2 py-1.5 bg-soc-bg">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {asset.kind === 'file' ? (
                      <FileText className="w-3.5 h-3.5 text-soc-textDim shrink-0" />
                    ) : asset.kind === 'credential' ? (
                      <Key className="w-3.5 h-3.5 text-soc-amber shrink-0" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-soc-textDim shrink-0" />
                    )}
                    <span className="font-mono text-[11px] text-soc-text truncate">{asset.label}</span>
                  </div>
                  {defender && (
                    <div className="mt-1 font-mono text-[10px] text-soc-cyan">{asset.honeytokenId}</div>
                  )}
                  {defender && staged && (
                    <p className="mt-1 text-[11px] text-soc-textMuted leading-snug">{staged.reason}</p>
                  )}
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      onClick={() => onOpenAssetPreview(asset)}
                      className="h-6 px-2 rounded border border-soc-border text-[11px] text-soc-textMuted hover:text-soc-text transition-colors duration-200"
                    >
                      Preview
                    </button>
                    {resident && (
                      <button
                        disabled={actionsLocked}
                        onClick={() => onPerformAction(interactionForAsset(asset))}
                        className="h-6 px-2 rounded border border-soc-border text-[11px] text-soc-text disabled:opacity-40 transition-colors duration-200"
                      >
                        Open
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-1.5 pt-2 border-t border-soc-border">
        <button
          disabled={actionsLocked}
          onClick={() => onPerformAction({ type: 'SCAN_HOST', targetNodeId: selectedNodeId })}
          className="h-8 rounded-md border border-soc-border text-[12px] text-soc-textMuted hover:text-soc-text disabled:opacity-40 transition-colors duration-200"
        >
          Scan host
        </button>
        <button
          disabled={moveDisabled}
          onClick={() => onPerformAction({ type: 'LATERAL_MOVE_ATTEMPT', targetNodeId: selectedNodeId })}
          className="h-8 rounded-md border border-soc-border text-[12px] text-soc-text disabled:opacity-40 transition-colors duration-200"
        >
          {moveLabel}
        </button>
      </div>
    </aside>
  );
}
