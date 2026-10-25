import { IncidentReport } from '../../domain/types';

export function ThreatIntelView({ report }: { report: IncidentReport }) {
  const tactics = new Map<string, IncidentReport['mitreMappings']>();
  for (const mapping of report.mitreMappings) {
    const key = `${mapping.tacticId} ${mapping.tacticName}`;
    const list = tactics.get(key) || [];
    list.push(mapping);
    tactics.set(key, list);
  }

  return (
    <div className="space-y-3">
      <section className="bg-soc-card border border-soc-border rounded-lg p-3">
        <h2 className="text-[15px] text-soc-text">ATT&CK mapping</h2>
        <p className="text-[12px] text-soc-textMuted mt-1 leading-relaxed">{report.scopeNotice}</p>
      </section>

      {report.mitreMappings.length === 0 ? (
        <section className="border border-dashed border-soc-border rounded-lg px-3 py-8 text-center text-[12px] text-soc-textDim">
          No mapped techniques in this view. Session start is intentionally unmapped.
        </section>
      ) : (
        Array.from(tactics.entries()).map(([tactic, rows]) => (
          <section key={tactic} className="bg-soc-card border border-soc-border rounded-lg overflow-hidden min-w-0">
            <header className="px-3 py-2 border-b border-soc-border text-[13px] text-soc-text">{tactic}</header>
            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-left text-[12px]">
                <thead className="text-soc-textDim">
                  <tr>
                    <th className="font-medium px-3 py-2">Technique</th>
                    <th className="font-medium px-3 py-2">Event</th>
                    <th className="font-medium px-3 py-2">Evidence</th>
                    <th className="font-medium px-3 py-2">Why this mapping</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.eventId} className="border-t border-soc-border align-top">
                      <td className="px-3 py-2 font-mono text-soc-cyan whitespace-nowrap">
                        {row.techniqueId}
                        <div className="text-soc-textMuted font-sans">{row.techniqueName}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-soc-textMuted whitespace-nowrap">
                        {row.eventType}
                        <div>{row.eventId}</div>
                      </td>
                      <td className="px-3 py-2 text-soc-textMuted max-w-xs">{row.evidence}</td>
                      <td className="px-3 py-2 text-soc-textMuted max-w-sm">{row.detectionExplanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      {report.unmappedEvents.length > 0 && (
        <section className="bg-soc-card border border-soc-border rounded-lg p-3">
          <h3 className="text-[13px] text-soc-text">Not mapped</h3>
          <ul className="mt-2 space-y-1">
            {report.unmappedEvents.map((item) => (
              <li key={item.eventId} className="text-[12px] text-soc-textMuted">
                <span className="font-mono text-soc-textDim">{item.eventType}</span> — {item.reason}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
