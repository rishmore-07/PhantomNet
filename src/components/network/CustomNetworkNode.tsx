import { Handle, Position } from '@xyflow/react';
import { Database, Laptop, Lock, Radio, Server, Shield } from 'lucide-react';
import { NodeId, NodeStatus } from '../../domain/types';

export interface CustomNodeData {
  [key: string]: unknown;
  id: NodeId;
  label: string;
  ip: string;
  role: string;
  status: NodeStatus;
  showSecurity: boolean;
  isCurrent: boolean;
  isSelected: boolean;
  decoyHost: boolean;
  adaptive: boolean;
}

const ICONS: Record<NodeId, typeof Server> = {
  gateway: Radio,
  web: Server,
  workstation: Laptop,
  finance: Shield,
  database: Database,
  'decoy-vault': Lock,
};

export function CustomNetworkNode({ data }: { data: CustomNodeData }) {
  const Icon = ICONS[data.id] || Server;
  const security = data.showSecurity ? data.status : 'healthy';

  const border =
    data.isCurrent
      ? 'border-soc-red'
      : data.isSelected
      ? 'border-soc-cyan'
      : security === 'triggered'
      ? 'border-soc-red/80'
      : security === 'suspicious'
      ? 'border-soc-amber/80'
      : 'border-soc-border';

  return (
    <div
      className={`w-[188px] rounded-md border bg-soc-card px-2.5 py-2 transition-colors duration-200 ${border} ${
        data.isSelected ? 'shadow-[0_0_0_1px_#38BDF8]' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-1.5 !h-1.5 !bg-soc-border !border-0" />
      <Handle type="source" position={Position.Right} className="!w-1.5 !h-1.5 !bg-soc-border !border-0" />

      <div className="flex items-start gap-2">
        <span className="mt-0.5 w-6 h-6 rounded bg-soc-elevated border border-soc-border flex items-center justify-center text-soc-textMuted">
          <Icon className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h4 className="text-[12px] leading-tight font-medium text-soc-text line-clamp-2">{data.label}</h4>
            {data.showSecurity && (
              <span
                className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${
                  security === 'triggered'
                    ? 'bg-soc-red'
                    : security === 'suspicious'
                    ? 'bg-soc-amber'
                    : 'bg-soc-green'
                }`}
                title={security}
              />
            )}
          </div>
          <div className="font-mono text-[10px] text-soc-textDim">{data.ip}</div>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-soc-textMuted">
        <span className="truncate">{data.role}</span>
        {data.isCurrent && <span className="font-mono text-soc-red shrink-0">session</span>}
      </div>

      {data.showSecurity && (data.decoyHost || data.adaptive) && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-soc-cyan">
          <span className="w-1.5 h-1.5 rounded-sm bg-soc-cyan" />
          {data.adaptive ? 'Decoy staged' : 'Decoy host'}
        </div>
      )}
    </div>
  );
}
