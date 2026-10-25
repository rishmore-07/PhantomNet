import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  ArrowRight,
  AlertTriangle,
  Server,
} from 'lucide-react';
import { IncidentReport } from '../../domain/types';

interface IncidentReportViewProps {
  report: IncidentReport;
}

export const IncidentReportView: React.FC<IncidentReportViewProps> = ({ report }) => {
  const [copied, setCopied] = useState(false);

  const downloadJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(report, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `phantomnet-incident-${report.sessionId}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-soc-card border border-soc-border rounded-xl p-5 space-y-6">
      {/* Report Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-soc-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-soc-cyan/10 border border-soc-cyan/30 text-soc-cyan font-mono text-xs font-bold uppercase">
              Simulated incident record
            </span>
            <span className="font-mono text-xs text-soc-textDim">
              Ref: {report.sessionId}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            {report.classification}
          </h2>
          <p className="text-xs text-soc-textDim mt-0.5">
            Compiled at {new Date(report.generatedAt).toLocaleString()} • Duration: {report.durationSeconds}s
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 rounded-lg border border-soc-border bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>

          <button
            onClick={downloadJson}
            className="px-3.5 py-1.5 rounded-lg bg-soc-cyan hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Dossier</span>
          </button>
        </div>
      </div>

      {/* Summary Narrative Banner */}
      <div className="bg-slate-900/60 p-4 rounded-lg border border-soc-border">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-soc-textDim mb-1">
          Executive Incident Narrative
        </h4>
        <p className="text-xs text-slate-200 leading-relaxed">
          {report.summary}
        </p>
      </div>

      {/* Traversal Trajectory Strip */}
      <div className="space-y-2">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-soc-textDim">
          Simulated session path ({report.attackTrajectory.length} locations)
        </h4>
        <div className="flex items-center gap-2 overflow-x-auto py-2 px-3 bg-slate-950 rounded-lg border border-soc-border no-scrollbar font-mono text-xs">
          {report.attackTrajectory.map((node, i) => (
            <React.Fragment key={i}>
              <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 flex items-center gap-1.5 shrink-0">
                <Server className="w-3.5 h-3.5 text-soc-cyan" />
                <span className="font-semibold">{node}</span>
              </div>
              {i < report.attackTrajectory.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-red-500 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Breached Honeytokens Table */}
      <div className="space-y-2">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-soc-textDim">
          Decoys opened in the simulation ({report.triggeredDecoys.length})
        </h4>

        {report.triggeredDecoys.length === 0 ? (
          <p className="text-xs text-soc-textDim italic bg-slate-900/40 p-3 rounded-lg border border-soc-border">
            No decoy file or synthetic credential was opened in this view.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left border border-soc-border rounded-lg overflow-hidden">
              <thead className="bg-slate-900 text-soc-textDim uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Asset Label</th>
                  <th className="py-2.5 px-3">Canary Honeytoken ID</th>
                  <th className="py-2.5 px-3">Host Node</th>
                  <th className="py-2.5 px-3">Detection Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soc-border bg-slate-950/60">
                {report.triggeredDecoys.map((decoy) => (
                  <tr key={decoy.assetId} className="hover:bg-slate-900/50">
                    <td className="py-2 px-3 font-semibold text-slate-200">
                      {decoy.assetLabel}
                    </td>
                    <td className="py-2 px-3 text-emerald-400 font-bold">
                      {decoy.honeytokenId}
                    </td>
                    <td className="py-2 px-3 text-cyan-300">
                      {decoy.nodeId}
                    </td>
                    <td className="py-2 px-3 text-soc-textDim">
                      {new Date(decoy.touchedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-soc-textDim">Score explanation</h4>
        <p className="text-[12px] text-soc-textMuted">
          Points are awarded per event, then capped at 100. Repeated scans and other low-signal actions stop adding points. A session move is not a host compromise. This is not a probability.
        </p>
        {report.scoreBreakdown.length === 0 ? (
          <p className="text-[12px] text-soc-textDim">No scoring events in this view.</p>
        ) : (
          <ul className="font-mono text-[11px] text-soc-textMuted space-y-1">
            {report.scoreBreakdown.map((row) => (
              <li key={row.eventType} className="border-b border-soc-border/60 pb-1">
                <div className="flex justify-between gap-3">
                  <span>
                    {row.eventType} × {row.count}
                    {row.suppressed > 0 ? ` (${row.suppressed} capped)` : ''}
                  </span>
                  <span>+{row.subtotal}</span>
                </div>
                <p className="text-soc-textDim font-sans">{row.note}</p>
              </li>
            ))}
            <li className="flex justify-between text-soc-text">
              <span>Capped total</span>
              <span>{report.threatScore}/100</span>
            </li>
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-soc-textDim">Adaptive decoys</h4>
        {report.adaptiveDeployments.length === 0 ? (
          <p className="text-[12px] text-soc-textDim">No adaptive decoy was staged in this view.</p>
        ) : (
          <ul className="space-y-1.5">
            {report.adaptiveDeployments.map((item) => (
              <li key={item.eventId} className="border border-soc-border rounded-md px-2.5 py-2 text-[12px]">
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-soc-cyan">{item.assetLabel}</span>
                  <span className="font-mono text-soc-textDim">{item.nodeId}</span>
                </div>
                <p className="text-soc-textMuted mt-1">{item.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-soc-textDim">ATT&CK mappings</h4>
        <p className="text-[12px] text-soc-textMuted">{report.scopeNotice}</p>
        {report.mitreMappings.length === 0 ? (
          <p className="text-[12px] text-soc-textDim">No technique is mapped for this prefix.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="text-soc-textDim">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Tactic</th>
                  <th className="py-1.5 pr-3 font-medium">Technique</th>
                  <th className="py-1.5 font-medium">Event</th>
                </tr>
              </thead>
              <tbody>
                {report.mitreMappings.map((row) => (
                  <tr key={row.eventId} className="border-t border-soc-border align-top">
                    <td className="py-1.5 pr-3 text-soc-textMuted">
                      {row.tacticId} {row.tacticName}
                    </td>
                    <td className="py-1.5 pr-3 text-soc-cyan">
                      {row.techniqueId}
                      <div className="text-soc-textMuted font-sans">{row.detectionExplanation}</div>
                    </td>
                    <td className="py-1.5 text-soc-textDim">{row.eventType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {report.replayView && (
        <p className="text-[12px] text-soc-amber">
          Export matches replay event {report.replayView.eventIndex + 1} of {report.replayView.eventsRecorded}.{' '}
          {report.replayView.note}
        </p>
      )}

      {/* Remediation Recommendations */}
      <div className="space-y-2">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-soc-textDim">
          Remediation & Containment Directives
        </h4>
        <div className="space-y-1.5">
          {report.recommendations.map((rec, i) => (
            <div
              key={i}
              className="p-2.5 rounded-lg bg-slate-900/70 border border-soc-border text-xs flex items-center gap-2 text-slate-300"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Raw JSON Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-soc-textDim">
            Forensic JSON Payload
          </h4>
          <span className="text-[10px] font-mono text-soc-textDim">
            Machine-Readable SIEM Schema
          </span>
        </div>
        <pre className="bg-slate-950 p-4 rounded-lg border border-soc-border text-slate-300 font-mono text-[11px] overflow-x-auto max-h-64 select-text">
          {JSON.stringify(report, null, 2)}
        </pre>
      </div>
    </div>
  );
};
