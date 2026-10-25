import React from 'react';
import {
  Clock,
  ArrowRight,
  ShieldAlert,
  Flame,
  Radio,
  FolderOpen,
  KeyRound,
  AlertOctagon,
  Radar,
} from 'lucide-react';
import { IntrusionEvent, EventType } from '../../domain/types';

interface TimelineViewProps {
  events: IntrusionEvent[];
  activeEventId?: string;
}

const eventTypeIcons: Record<EventType, React.FC<{ className?: string }>> = {
  SESSION_STARTED: Radio,
  SCAN_HOST: Radio,
  BROWSE_DIRECTORY: FolderOpen,
  LOGIN_FAILED: KeyRound,
  SENSITIVE_FILE_OPENED: ShieldAlert,
  HONEYTOKEN_VIEWED: Flame,
  FAKE_CREDENTIAL_USED: AlertOctagon,
  LATERAL_MOVE_ATTEMPT: ArrowRight,
  DECOY_DEPLOYED: Radar,
};

export const TimelineView: React.FC<TimelineViewProps> = ({ events, activeEventId }) => {
  // Ordered chronologically
  const chronologicalEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="bg-soc-card border border-soc-border rounded-xl p-4 space-y-4">
      <div className="pb-3 border-b border-soc-border flex items-center justify-between">
        <div>
          <h3 className="font-mono font-bold text-white text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-soc-cyan" />
            <span>Chronological Incident Timeline ({chronologicalEvents.length} Events)</span>
          </h3>
          <p className="text-xs text-soc-textDim">
            Sequential forensic record derived directly from the immutable event stream.
          </p>
        </div>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-soc-border">
        {chronologicalEvents.map((event, idx) => {
          const Icon = eventTypeIcons[event.type] || Radio;
          const isCritical = event.severity === 'critical';
          const isHigh = event.severity === 'high';

          return (
            <div key={event.id} className="relative group">
              {/* Stepper Dot */}
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                  isCritical
                    ? 'bg-red-950 border-red-500 text-red-400 ring-2 ring-red-500/40'
                    : isHigh
                    ? 'bg-amber-950 border-amber-500 text-amber-400 ring-1 ring-amber-500/30'
                    : 'bg-slate-900 border-soc-border text-soc-cyan'
                }`}
              >
                <Icon className="w-2.5 h-2.5" />
              </div>

              {/* Event Card */}
              <div
                className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors duration-200 ${
                  activeEventId === event.id
                    ? 'border-soc-cyan bg-soc-elevated'
                    : isCritical
                    ? 'bg-red-950/20 border-red-500/30'
                    : isHigh
                    ? 'bg-amber-950/10 border-amber-500/30'
                    : 'bg-slate-900/60 border-soc-border group-hover:border-soc-borderLight'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-soc-textDim font-bold">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-100">
                      {event.type}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        isCritical
                          ? 'bg-red-900/80 text-red-300'
                          : isHigh
                          ? 'bg-amber-900/80 text-amber-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {event.severity}
                    </span>
                  </div>

                  <div className="text-[11px] text-soc-textDim">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                <p className="text-slate-300 text-[11px]">
                  {event.explanation}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-soc-border/40 text-[10px] font-mono text-soc-textDim">
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <span>Host:</span>
                    <span className="font-bold">{event.targetNodeId || event.sourceNodeId}</span>
                    {event.type === 'LATERAL_MOVE_ATTEMPT' && (
                      <span className="text-soc-textMuted">
                        ({event.sourceNodeId} → {event.targetNodeId})
                      </span>
                    )}
                    {event.policyId && <span className="text-soc-cyan">{event.policyId}</span>}
                  </div>

                  {event.scoreDelta > 0 && (
                    <span className="text-amber-400 font-bold">
                      +{event.scoreDelta} Risk Score
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
