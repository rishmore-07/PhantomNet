import { FileText, FolderOpen, Globe, KeyRound, Radio } from 'lucide-react';
import { DecoyAsset, DecoyDeploymentRecord, IntrusionEvent, NodeId } from '../../domain/types';
import { INITIAL_NODES, getAllowedTransitions } from '../../data/networkSeed';
import { interactionForAsset } from '../../domain/assets';
import { presentHost } from '../../domain/presentation';
import { PerformActionParams } from '../../domain/simulation';
import { Perspective } from '../../hooks/useSimulationStore';

interface AttackerConsoleProps {
  currentNodeId: NodeId;
  events: IntrusionEvent[];
  assets: DecoyAsset[];
  deployments: DecoyDeploymentRecord[];
  perspective: Perspective;
  actionsLocked: boolean;
  onPerformAction: (params: PerformActionParams) => boolean;
  onOpenAssetPreview: (asset: DecoyAsset) => void;
}

function shellLine(event: IntrusionEvent, perspective: Perspective): string | null {
  if (perspective === 'attacker' && event.actor === 'system') return null;
  if (event.type === 'DECOY_DEPLOYED') return event.explanation;
  if (event.type === 'SCAN_HOST') return `scan ${event.targetNodeId} — simulated service list returned`;
  if (event.type === 'BROWSE_DIRECTORY') return `ls ${event.targetNodeId}`;
  if (event.type === 'LOGIN_FAILED') return `login ${event.targetNodeId} — rejected`;
  if (event.type === 'LATERAL_MOVE_ATTEMPT') return `move ${event.sourceNodeId} -> ${event.targetNodeId}`;
  if (event.type === 'SENSITIVE_FILE_OPENED') return `open ${event.assetLabel || 'file'}`;
  if (event.type === 'HONEYTOKEN_VIEWED') return `read ${event.assetLabel || 'credential'}`;
  if (event.type === 'FAKE_CREDENTIAL_USED') return `auth ${event.targetNodeId} — synthetic credential presented`;
  if (event.type === 'SESSION_STARTED') return `session attached at ${event.targetNodeId}`;
  return event.explanation;
}

export function AttackerConsole({
  currentNodeId,
  events,
  assets,
  deployments,
  perspective,
  actionsLocked,
  onPerformAction,
  onOpenAssetPreview,
}: AttackerConsoleProps) {
  const node = INITIAL_NODES.find((item) => item.id === currentNodeId);
  const host = node ? presentHost(node, perspective) : null;
  const hops = getAllowedTransitions(currentNodeId);
  const defender = perspective === 'defender';
  const lines = events
    .map((event) => ({ id: event.id, text: shellLine(event, perspective), time: event.timestamp }))
    .filter((line): line is { id: string; text: string; time: string } => Boolean(line.text))
    .slice(-10);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
      <div className="xl:col-span-3 space-y-3">
        <section className="bg-soc-card border border-soc-border rounded-lg p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[15px] text-soc-text">{defender ? 'Simulator' : 'Host session'}</h2>
            <span className="font-mono text-[11px] text-soc-textDim">{node?.ip}</span>
          </div>
          <p className="text-[12px] text-soc-textMuted mt-1">
            {host?.label}. Actions append to the same event log used by the map and the report.
            {actionsLocked ? ' Playback is active, so new actions are paused.' : ''}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              disabled={actionsLocked}
              onClick={() => onPerformAction({ type: 'SCAN_HOST', targetNodeId: currentNodeId })}
              className="text-left rounded-md border border-soc-border bg-soc-bg px-2.5 py-2 disabled:opacity-40 hover:border-soc-borderLight transition-colors duration-200"
            >
              <Radio className="w-3.5 h-3.5 text-soc-cyan" />
              <div className="text-[12px] text-soc-text mt-1">Scan services</div>
            </button>
            <button
              disabled={actionsLocked}
              onClick={() => onPerformAction({ type: 'BROWSE_DIRECTORY', targetNodeId: currentNodeId })}
              className="text-left rounded-md border border-soc-border bg-soc-bg px-2.5 py-2 disabled:opacity-40 hover:border-soc-borderLight transition-colors duration-200"
            >
              <FolderOpen className="w-3.5 h-3.5 text-soc-cyan" />
              <div className="text-[12px] text-soc-text mt-1">List directory</div>
            </button>
            <button
              disabled={actionsLocked}
              onClick={() => onPerformAction({ type: 'LOGIN_FAILED', targetNodeId: currentNodeId })}
              className="text-left rounded-md border border-soc-border bg-soc-bg px-2.5 py-2 disabled:opacity-40 hover:border-soc-borderLight transition-colors duration-200"
            >
              <KeyRound className="w-3.5 h-3.5 text-soc-amber" />
              <div className="text-[12px] text-soc-text mt-1">Try a login</div>
            </button>
            <button
              disabled={actionsLocked}
              onClick={() =>
                onPerformAction({
                  type: 'FAKE_CREDENTIAL_USED',
                  targetNodeId: currentNodeId,
                  customExplanation: `Simulated authentication attempt presented a synthetic credential to ${currentNodeId}.`,
                })
              }
              className="text-left rounded-md border border-soc-border bg-soc-bg px-2.5 py-2 disabled:opacity-40 hover:border-soc-borderLight transition-colors duration-200"
            >
              <KeyRound className="w-3.5 h-3.5 text-soc-red" />
              <div className="text-[12px] text-soc-text mt-1">Present credential</div>
            </button>
          </div>
        </section>

        <section className="bg-soc-card border border-soc-border rounded-lg p-3">
          <h3 className="text-[13px] text-soc-text mb-2">Adjacent hosts</h3>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {INITIAL_NODES.map((candidate) => {
              const label = presentHost(candidate, perspective).label;
              const here = candidate.id === currentNodeId;
              const open = hops.includes(candidate.id);
              return (
                <button
                  key={candidate.id}
                  disabled={here || !open || actionsLocked}
                  onClick={() => onPerformAction({ type: 'LATERAL_MOVE_ATTEMPT', targetNodeId: candidate.id })}
                  className="text-left rounded-md border border-soc-border px-2.5 py-2 disabled:opacity-40 hover:border-soc-borderLight transition-colors duration-200"
                >
                  <div className="text-[12px] text-soc-text truncate">{label}</div>
                  <div className="font-mono text-[10px] text-soc-textDim">{candidate.ip}</div>
                  <div className="text-[10px] text-soc-textMuted mt-0.5">
                    {here ? 'Current session' : open ? 'Route exists' : 'No route'}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-soc-card border border-soc-border rounded-lg p-3">
          <h3 className="text-[13px] text-soc-text mb-2">Directory</h3>
          {assets.length === 0 ? (
            <p className="text-[12px] text-soc-textDim">This host has no listed files in the current view.</p>
          ) : (
            <ul className="divide-y divide-soc-border">
              {assets.map((asset) => {
                const staged = deployments.find((item) => item.assetId === asset.id && item.origin === 'adaptive');
                return (
                  <li key={asset.id} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {asset.kind === 'endpoint' ? (
                          <Globe className="w-3.5 h-3.5 text-soc-textDim" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-soc-textDim" />
                        )}
                        <span className="font-mono text-[12px] text-soc-text truncate">{asset.label}</span>
                      </div>
                      {defender && staged && (
                        <p className="text-[11px] text-soc-textMuted mt-1">{staged.reason}</p>
                      )}
                      {defender && (
                        <div className="font-mono text-[10px] text-soc-cyan mt-0.5">{asset.honeytokenId}</div>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => onOpenAssetPreview(asset)}
                        className="h-7 px-2 rounded border border-soc-border text-[11px] text-soc-textMuted"
                      >
                        Preview
                      </button>
                      <button
                        disabled={actionsLocked}
                        onClick={() => onPerformAction(interactionForAsset(asset))}
                        className="h-7 px-2 rounded border border-soc-border text-[11px] text-soc-text disabled:opacity-40"
                      >
                        Open
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="xl:col-span-2 bg-[#070b12] border border-soc-border rounded-lg p-3 font-mono text-[11px] min-h-[320px] flex flex-col">
        <div className="text-soc-textDim mb-2">
          {defender ? 'session.log' : `${currentNodeId} — shell`}
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {lines.map((line) => (
            <div key={line.id}>
              <span className="text-soc-textDim">{new Date(line.time).toLocaleTimeString()} </span>
              <span className="text-soc-text">{line.text}</span>
            </div>
          ))}
        </div>
        <div className="pt-2 text-soc-cyan">
          {perspective === 'attacker' ? 'operator' : 'soc'}@{currentNodeId}
          <span className="inline-block w-1.5 h-3 ml-1 bg-soc-cyan align-middle" />
        </div>
      </section>
    </div>
  );
}
