import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle,
  Clock,
  Server,
  Key,
  Filter,
} from 'lucide-react';
import { Alert, Severity } from '../../domain/types';
import { INITIAL_NODES } from '../../data/networkSeed';
import { presentCopy, presentHost } from '../../domain/presentation';
import { Perspective } from '../../hooks/useSimulationStore';

interface AlertsPanelProps {
  alerts: Alert[];
  perspective?: Perspective;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, perspective = 'defender' }) => {
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'all') return true;
    return a.severity === filterSeverity;
  });

  return (
    <div className="bg-soc-card border border-soc-border rounded-xl p-4 space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-soc-border">
        <div>
          <h3 className="font-mono font-bold text-white text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-soc-cyan" />
            <span>High-Signal Detection Alerts ({alerts.length})</span>
          </h3>
          <p className="text-xs text-soc-textDim">
            Alerts derived from the events currently in view. This is not a live sensor feed.
          </p>
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-soc-textDim" />
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2 py-1 rounded text-[11px] capitalize transition-colors ${
                filterSeverity === sev
                  ? 'bg-soc-surface text-cyan-300 border border-soc-cyan/40 font-bold'
                  : 'text-soc-textDim hover:text-white bg-slate-900/60'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      {filteredAlerts.length === 0 ? (
        <div className="py-12 text-center text-soc-textDim space-y-2">
          <CheckCircle className="w-8 h-8 mx-auto text-slate-700" />
          <p className="text-xs font-mono">No active alerts matching this filter.</p>
          <p className="text-[11px]">
            Record a simulated action to derive alerts. This panel is not a live sensor feed.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          {filteredAlerts.map((alert) => {
            const node = INITIAL_NODES.find((n) => n.id === alert.nodeId);
            const host = node ? presentHost(node, perspective) : null;
            const conceal = perspective === 'attacker';

            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded-lg border transition-all ${
                  alert.severity === 'critical'
                    ? 'bg-red-950/30 border-red-500/40 hover:border-red-500'
                    : alert.severity === 'high'
                    ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500'
                    : 'bg-slate-900/60 border-soc-border hover:border-soc-borderLight'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {alert.severity === 'critical' ? (
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    ) : alert.severity === 'high' ? (
                      <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    )}

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-mono font-bold text-slate-100">
                          {presentCopy(
                            conceal ? alert.title.replace('Decoy file opened', 'File opened') : alert.title,
                            perspective
                          )}
                        </h4>
                        <span
                          className={`px-1.5 py-0.2 rounded font-mono text-[9px] uppercase font-bold ${
                            alert.severity === 'critical'
                              ? 'bg-red-900/80 text-red-300 border border-red-500/40'
                              : alert.severity === 'high'
                              ? 'bg-amber-900/80 text-amber-300 border border-amber-500/40'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-1">
                        {presentCopy(alert.description, perspective)}
                      </p>

                      {/* Evidence Card */}
                      <div className="mt-2 bg-slate-950/80 p-2 rounded border border-soc-border/60 font-mono text-[11px] text-soc-textMuted space-y-1">
                        <div>
                          <span className="text-cyan-400 font-semibold">Evidence: </span>
                          <span className="text-slate-200">{presentCopy(alert.evidence, perspective)}</span>
                        </div>
                        {!conceal && alert.honeytokenId && (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Key className="w-3 h-3" />
                            <span>HoneyToken Tripwire: </span>
                            <span className="font-bold underline">{alert.honeytokenId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono text-[10px] text-soc-textDim space-y-1">
                    <div className="flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end text-slate-400">
                      <Server className="w-3 h-3" />
                      <span>{conceal ? host?.label || alert.nodeId : node?.ip || alert.nodeId}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
