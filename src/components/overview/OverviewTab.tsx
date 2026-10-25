import { DecoyDeploymentRecord, IntrusionEvent, NodeId } from '../../domain/types';
import { INITIAL_NODES } from '../../data/networkSeed';
import { presentCopy, presentHost } from '../../domain/presentation';
import { Perspective } from '../../hooks/useSimulationStore';

interface OverviewRailProps {
  events: IntrusionEvent[];
  perspective: Perspective;
  onOpenIncidents: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  SESSION_STARTED: 'Session',
  SCAN_HOST: 'Scan',
  BROWSE_DIRECTORY: 'Directory',
  LOGIN_FAILED: 'Login failed',
  SENSITIVE_FILE_OPENED: 'File opened',
  HONEYTOKEN_VIEWED: 'Credential read',
  FAKE_CREDENTIAL_USED: 'Credential used',
  LATERAL_MOVE_ATTEMPT: 'Lateral move',
  DECOY_DEPLOYED: 'Decoy staged',
};

export function EventFeed({ events, perspective, onOpenIncidents }: OverviewRailProps) {
  const visible = (perspective === 'attacker' ? events.filter((event) => event.actor !== 'system') : events)
    .slice()
    .reverse()
    .slice(0, 8);

  return (
    <section className="bg-soc-card border border-soc-border rounded-lg p-3 h-full min-h-[280px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[13px] text-soc-text">Recent events</h3>
        <button onClick={onOpenIncidents} className="text-[11px] text-soc-cyan">
          Incidents
        </button>
      </div>
      {visible.length === 0 ? (
        <p className="text-[12px] text-soc-textDim py-8 text-center">No events in the current view.</p>
      ) : (
        <ul className="space-y-1.5 overflow-y-auto">
          {visible.map((event) => (
            <li key={event.id} className="border border-soc-border rounded-md px-2 py-1.5 bg-soc-bg">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-soc-text">{TYPE_LABEL[event.type] || event.type}</span>
                <span className="font-mono text-[10px] text-soc-textDim">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-[11px] text-soc-textMuted mt-0.5 line-clamp-2">
                {presentCopy(event.explanation, perspective)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ActivityChart({ events, perspective }: { events: IntrusionEvent[]; perspective: Perspective }) {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.type === 'SESSION_STARTED') continue;
    if (perspective === 'attacker' && event.type === 'DECOY_DEPLOYED') continue;
    counts.set(event.type, (counts.get(event.type) || 0) + 1);
  }
  const rows = Array.from(counts.entries());
  const max = Math.max(1, ...rows.map(([, count]) => count));

  return (
    <section className="bg-soc-card border border-soc-border rounded-lg p-3">
      <h3 className="text-[13px] text-soc-text">Event mix</h3>
      <p className="text-[11px] text-soc-textDim mb-2">Counts from the events currently in view.</p>
      {rows.length === 0 ? (
        <p className="text-[12px] text-soc-textDim py-4">Record an action to populate this chart.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map(([type, count]) => (
            <li key={type} className="grid grid-cols-[112px_1fr_24px] items-center gap-2">
              <span className="text-[11px] text-soc-textMuted truncate">{TYPE_LABEL[type] || type}</span>
              <span className="h-1.5 rounded-full bg-soc-elevated overflow-hidden">
                <span
                  className="block h-full rounded-full bg-soc-cyan transition-[width] duration-200"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </span>
              <span className="font-mono text-[11px] text-soc-textDim text-right">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PriorityAlerts({
  alerts,
  perspective,
}: {
  alerts: Array<{ id: string; severity: string; title: string; nodeId: string; timestamp: string }>;
  perspective: Perspective;
}) {
  if (perspective === 'attacker') {
    return (
      <section className="bg-soc-card border border-soc-border rounded-lg p-3">
        <h3 className="text-[13px] text-soc-text">Detection panel</h3>
        <p className="text-[12px] text-soc-textMuted mt-2">
          Alert titles, honeytoken identifiers, and staged-decoy reasons stay on the SOC perspective.
        </p>
      </section>
    );
  }
  const priority = alerts.filter((alert) => alert.severity === 'critical' || alert.severity === 'high');
  return (
    <section className="bg-soc-card border border-soc-border rounded-lg p-3">
      <h3 className="text-[13px] text-soc-text">High-priority incidents</h3>
      <p className="text-[11px] text-soc-textDim mb-2">Critical and high alerts from this view.</p>
      {priority.length === 0 ? (
        <p className="text-[12px] text-soc-textDim py-4">No high-priority alerts in the current prefix.</p>
      ) : (
        <ul className="space-y-1.5">
          {priority.slice(0, 4).map((alert) => (
            <li key={alert.id} className="border border-soc-border rounded-md px-2 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-mono uppercase ${alert.severity === 'critical' ? 'text-soc-red' : 'text-soc-amber'}`}>
                  {alert.severity}
                </span>
                <span className="font-mono text-[10px] text-soc-textDim">{alert.nodeId}</span>
              </div>
              <p className="text-[12px] text-soc-text mt-0.5">{alert.title}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DeceptionPanel({
  deployments,
  perspective,
}: {
  deployments: DecoyDeploymentRecord[];
  perspective: Perspective;
}) {
  const adaptive = deployments.filter((item) => item.origin === 'adaptive');
  const defender = perspective === 'defender';
  return (
    <section className="bg-soc-card border border-soc-border rounded-lg p-3">
      <h3 className="text-[13px] text-soc-text">{defender ? 'Active deception assets' : 'Visible files'}</h3>
      <p className="text-[11px] text-soc-textDim mb-2">
        {defender
          ? 'Baseline assets stay in place. Staged assets appear only after a deployment event.'
          : 'Directory contents for hosts you have reached. Markers used by the SOC are hidden.'}
      </p>
      {defender ? (
        adaptive.length === 0 ? (
          <p className="text-[12px] text-soc-textDim py-4">No adaptive decoy has been staged in this view.</p>
        ) : (
          <ul className="space-y-1.5">
            {adaptive.map((item) => {
              const host = INITIAL_NODES.find((node) => node.id === item.nodeId);
              const name = host ? presentHost(host, 'defender').label : item.nodeId;
              return (
                <li key={item.eventId || item.assetId} className="border border-soc-border rounded-md px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-soc-cyan truncate">{item.assetLabel}</span>
                    <span className="text-[10px] text-soc-textDim shrink-0">{name}</span>
                  </div>
                  <p className="text-[11px] text-soc-textMuted mt-1 leading-snug">{item.reason}</p>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <p className="text-[12px] text-soc-textMuted">
          {deployments.filter((item) => item.origin === 'baseline').length} files are part of the environment.
          Newly staged files show up in the simulator directory without a decoy label.
        </p>
      )}
    </section>
  );
}

export function nodeName(id: NodeId, perspective: Perspective) {
  const node = INITIAL_NODES.find((item) => item.id === id);
  return node ? presentHost(node, perspective).label : id;
}
