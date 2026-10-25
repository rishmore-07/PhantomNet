import { Bell, Crosshair, Eye, Settings } from 'lucide-react';
import { Perspective } from '../../hooks/useSimulationStore';
import { NodeId } from '../../domain/types';

interface TopBarProps {
  perspective: Perspective;
  setPerspective: (perspective: Perspective) => void;
  sessionId: string;
  currentNodeId: NodeId;
  alertCount: number;
  replaying: boolean;
  onOpenIncidents: () => void;
  onOpenSettings: () => void;
}

export function TopBar({
  perspective,
  setPerspective,
  sessionId,
  currentNodeId,
  alertCount,
  replaying,
  onOpenIncidents,
  onOpenSettings,
}: TopBarProps) {
  return (
    <header className="h-12 shrink-0 border-b border-soc-border bg-soc-bg/95 flex items-center justify-between gap-3 px-3 md:px-4">
      <div className="min-w-0">
        <div className="text-[13px] text-soc-text">Security Operations Center</div>
        <div className="text-[11px] text-soc-textDim truncate">
          Simulated workspace · session <span className="font-mono text-soc-textMuted">{sessionId}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`hidden sm:inline-flex items-center gap-1.5 h-7 px-2 rounded-md border text-[11px] font-mono ${
            replaying
              ? 'border-soc-cyan/40 text-soc-cyan bg-soc-cyan/10'
              : 'border-soc-border text-soc-textMuted bg-soc-card'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${replaying ? 'bg-soc-cyan' : 'bg-soc-green'}`} />
          {replaying ? 'Replaying' : 'Live session'}
        </span>
        <span className="hidden lg:inline font-mono text-[11px] text-soc-textDim">
          host {currentNodeId}
        </span>

        <div className="flex h-7 rounded-md border border-soc-border bg-soc-card p-0.5">
          <button
            onClick={() => setPerspective('defender')}
            className={`px-2 rounded flex items-center gap-1 text-[11px] transition-colors duration-200 ${
              perspective === 'defender' ? 'bg-soc-elevated text-soc-text' : 'text-soc-textDim'
            }`}
          >
            <Eye className="w-3 h-3" />
            SOC
          </button>
          <button
            onClick={() => setPerspective('attacker')}
            className={`px-2 rounded flex items-center gap-1 text-[11px] transition-colors duration-200 ${
              perspective === 'attacker' ? 'bg-soc-elevated text-soc-red' : 'text-soc-textDim'
            }`}
          >
            <Crosshair className="w-3 h-3" />
            Attacker
          </button>
        </div>

        <button
          onClick={onOpenSettings}
          className="md:hidden w-7 h-7 rounded-md border border-soc-border bg-soc-card text-soc-textMuted"
          aria-label="Settings"
        >
          <Settings className="w-3.5 h-3.5 mx-auto" />
        </button>
        <button
          onClick={onOpenIncidents}
          className="relative w-7 h-7 rounded-md border border-soc-border bg-soc-card text-soc-textMuted hover:text-soc-text transition-colors duration-200"
          aria-label={`${alertCount} alerts`}
        >
          <Bell className="w-3.5 h-3.5 mx-auto" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-soc-red text-[9px] font-mono text-[#1a0b0b] leading-none flex items-center justify-center">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
