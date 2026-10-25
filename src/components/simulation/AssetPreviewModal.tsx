import React from 'react';
import {
  X,
  FileText,
  Key,
  Globe,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { DecoyAsset, NodeId } from '../../domain/types';
import { INITIAL_NODES } from '../../data/networkSeed';
import { Perspective } from '../../hooks/useSimulationStore';
import { presentMetadata, presentPreview } from '../../domain/presentation';

interface AssetPreviewModalProps {
  asset: DecoyAsset | null;
  currentNodeId: NodeId;
  perspective: Perspective;
  onClose: () => void;
  onInteract: (asset: DecoyAsset) => void;
}

export const AssetPreviewModal: React.FC<AssetPreviewModalProps> = ({
  asset,
  currentNodeId,
  perspective,
  onClose,
  onInteract,
}) => {
  if (!asset) return null;

  const hostNode = INITIAL_NODES.find((n) => n.id === asset.nodeId);
  const isResident = currentNodeId === asset.nodeId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-soc-card border border-soc-border rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-soc-border flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-soc-cyan">
              {asset.kind === 'file' ? (
                <FileText className="w-4 h-4" />
              ) : asset.kind === 'credential' ? (
                <Key className="w-4 h-4" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-mono font-bold text-white text-sm">
                {asset.label}
              </h3>
              <p className="text-[11px] text-soc-textDim font-mono">
                Hosted on {hostNode?.label} ({hostNode?.ip})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-soc-textDim hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canary Notice */}
        <div className="px-5 py-2.5 bg-cyan-950/40 border-b border-cyan-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-cyan-300">
            <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-mono text-[11px]">
              {perspective === 'defender'
                ? `ACTIVE HONEYTOKEN: ${asset.honeytokenId}`
                : 'SYNTHETIC ENTERPRISE DIGITAL ASSET'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400/80 uppercase">
            Inert Simulation
          </span>
        </div>

        {/* Content Preview Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 font-mono text-xs">
          <div>
            <span className="text-soc-textDim text-[11px] block mb-1">
              File Payload / Preview:
            </span>
            <pre className="bg-slate-950 p-4 rounded-lg border border-soc-border text-slate-200 overflow-x-auto text-[11px] leading-relaxed whitespace-pre-wrap select-text">
              {presentPreview(asset.preview, perspective)}
            </pre>
          </div>

          {/* Metadata Grid */}
          {asset.metadata && (
            <div>
              <span className="text-soc-textDim text-[11px] block mb-1">
                Asset Metadata:
              </span>
              <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-lg border border-soc-border text-[11px]">
                {presentMetadata(asset.metadata, perspective).map(([key, val]) => (
                  <div key={key}>
                    <span className="text-soc-textDim capitalize">{key}: </span>
                    <span className="text-slate-200">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-soc-border bg-slate-900/80 flex items-center justify-between">
          <span className="text-[11px] font-mono text-soc-textDim">
            {isResident
              ? 'Ready for attacker interaction.'
              : `Attacker currently on '${currentNodeId}'. Move here to interact.`}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-soc-border bg-slate-800 text-slate-300 hover:text-white font-mono text-xs transition-colors"
            >
              Close
            </button>

            {isResident ? (
              <button
                onClick={() => {
                  onInteract(asset);
                  onClose();
                }}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{perspective === 'defender' ? 'Record interaction' : 'Open file'}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
