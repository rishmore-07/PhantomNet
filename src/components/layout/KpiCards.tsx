import { NodeId } from '../../domain/types';

interface KpiCardsProps {
  threatScore: number;
  threatLevel: { level: string; color: string };
  currentNodeId: NodeId;
  totalAlerts: number;
  criticalAlerts: number;
  adaptiveCount: number;
  touchedDecoys: number;
  eventsCount: number;
  concealDefense: boolean;
}

export function KpiCards({
  threatScore,
  threatLevel,
  currentNodeId,
  totalAlerts,
  criticalAlerts,
  adaptiveCount,
  touchedDecoys,
  eventsCount,
  concealDefense,
}: KpiCardsProps) {
  const items = [
    {
      label: 'Threat score',
      value: String(threatScore),
      suffix: '/100',
      detail: threatLevel.level,
      tone: threatLevel.color,
    },
    {
      label: 'Alerts',
      value: String(totalAlerts),
      suffix: '',
      detail: criticalAlerts > 0 ? `${criticalAlerts} critical` : 'From recorded events',
      tone: criticalAlerts > 0 ? '#F87171' : '#94A3B8',
    },
    concealDefense
      ? {
          label: 'Events in view',
          value: String(eventsCount),
          suffix: '',
          detail: 'Defense markers hidden',
          tone: '#94A3B8',
        }
      : {
          label: 'Decoys touched',
          value: String(touchedDecoys),
          suffix: '',
          detail: `${adaptiveCount} staged this session`,
          tone: touchedDecoys > 0 ? '#F87171' : '#34D399',
        },
    {
      label: 'Session host',
      value: currentNodeId,
      suffix: '',
      detail: `${eventsCount} events in view`,
      tone: '#38BDF8',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {items.map((item) => (
        <div key={item.label} className="bg-soc-card border border-soc-border rounded-lg px-3 py-2.5">
          <div className="text-[11px] text-soc-textDim">{item.label}</div>
          <div className="mt-1 flex items-baseline gap-1.5 min-w-0">
            <span className="font-mono text-[20px] leading-none text-soc-text truncate">{item.value}</span>
            {item.suffix && <span className="font-mono text-[11px] text-soc-textDim">{item.suffix}</span>}
          </div>
          <div className="mt-1.5 text-[11px] truncate" style={{ color: item.tone }}>
            {item.detail}
          </div>
        </div>
      ))}
    </div>
  );
}
