import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

interface ReplayBarProps {
  index: number;
  total: number;
  playing: boolean;
  active: boolean;
  onToggle: () => void;
  onStep: (direction: -1 | 1) => void;
  onScrub: (index: number) => void;
  onResetPlayback: () => void;
  onLive: () => void;
  onDemonstrate: () => void;
  onResetSession: () => void;
}

export function ReplayBar({
  index,
  total,
  playing,
  active,
  onToggle,
  onStep,
  onScrub,
  onResetPlayback,
  onLive,
  onDemonstrate,
  onResetSession,
}: ReplayBarProps) {
  const last = Math.max(0, total - 1);
  const shown = active ? index : last;

  return (
    <div className="h-10 shrink-0 border-b border-soc-border bg-soc-sidebar flex items-center gap-2 px-3 md:px-4 overflow-x-auto">
      <button
        onClick={onToggle}
        className="h-7 px-2 rounded-md bg-soc-cyan text-[#08202c] text-[12px] font-medium inline-flex items-center gap-1 transition-colors duration-200 hover:brightness-110"
        aria-label={playing ? 'Pause replay' : 'Play replay'}
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        {playing ? 'Pause' : 'Play'}
      </button>
      <button
        onClick={() => onStep(-1)}
        className="w-7 h-7 rounded-md border border-soc-border text-soc-textMuted hover:text-soc-text transition-colors duration-200"
        aria-label="Previous event"
      >
        <SkipBack className="w-3.5 h-3.5 mx-auto" />
      </button>
      <button
        onClick={() => onStep(1)}
        className="w-7 h-7 rounded-md border border-soc-border text-soc-textMuted hover:text-soc-text transition-colors duration-200"
        aria-label="Next event"
      >
        <SkipForward className="w-3.5 h-3.5 mx-auto" />
      </button>
      <input
        aria-label="Replay position"
        type="range"
        min={0}
        max={last}
        value={shown}
        onChange={(event) => onScrub(Number(event.target.value))}
        className="w-24 sm:w-40 accent-[#38BDF8]"
      />
      <span className="font-mono text-[11px] text-soc-textMuted tabular-nums">
        {shown + 1}/{total}
      </span>
      <button
        onClick={onResetPlayback}
        className="hidden sm:inline h-7 px-2 rounded-md text-[12px] text-soc-textMuted hover:text-soc-text transition-colors duration-200"
      >
        Start
      </button>
      <button
        onClick={onLive}
        className={`h-7 px-2 rounded-md text-[12px] transition-colors duration-200 ${
          active ? 'text-soc-cyan' : 'text-soc-textDim'
        }`}
      >
        Live
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={onResetSession}
          className="h-7 px-2 rounded-md border border-soc-border text-[12px] text-soc-textMuted hover:text-soc-text inline-flex items-center gap-1 transition-colors duration-200"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">Reset</span>
        </button>
        <button
          onClick={onDemonstrate}
          className="h-7 px-2.5 rounded-md border border-soc-cyan/50 text-[12px] text-soc-cyan hover:bg-soc-cyan/10 transition-colors duration-200"
        >
          Demonstrate
        </button>
      </div>
    </div>
  );
}
