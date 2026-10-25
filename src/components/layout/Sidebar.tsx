import {
  Activity,
  FileJson,
  Network,
  Radar,
  Settings,
  Shield,
  TerminalSquare,
} from 'lucide-react';
import { ActiveTab } from '../../hooks/useSimulationStore';

const NAV: Array<{ id: ActiveTab; label: string; icon: typeof Activity }> = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'network', label: 'Network Topology', icon: Network },
  { id: 'simulator', label: 'Attack Simulator', icon: TerminalSquare },
  { id: 'intel', label: 'Threat Intelligence', icon: Radar },
  { id: 'incidents', label: 'Incidents', icon: Shield },
  { id: 'reports', label: 'Reports', icon: FileJson },
];

function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path
        d="M12 2.4 19.2 5.4v6.1c0 4.1-2.7 7.2-7.2 9.1-4.5-1.9-7.2-5-7.2-9.1V5.4L12 2.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="8.2" cy="11" r="1" fill="currentColor" />
      <circle cx="15.8" cy="11" r="1" fill="currentColor" />
      <circle cx="12" cy="14.2" r="1" fill="currentColor" />
      <path d="M8.2 11 12 14.2 15.8 11" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
}

export function Sidebar({ activeTab, setActiveTab, onOpenSettings }: SidebarProps) {
  return (
    <aside className="hidden md:flex w-[212px] shrink-0 flex-col bg-soc-sidebar border-r border-soc-border">
      <div className="h-12 px-3 flex items-center gap-2.5 border-b border-soc-border">
        <span className="w-7 h-7 rounded-md bg-soc-elevated border border-soc-border text-soc-cyan flex items-center justify-center">
          <Mark />
        </span>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-wide text-soc-text">PHANTOMNET</div>
          <div className="text-[10px] text-soc-textDim">Deception lab</div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5" aria-label="Workspace">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`w-full h-8 px-2 rounded-md flex items-center gap-2 text-[13px] transition-colors duration-200 ${
                active
                  ? 'bg-soc-elevated text-soc-text'
                  : 'text-soc-textMuted hover:text-soc-text hover:bg-soc-card'
              }`}
            >
              <span className={`w-0.5 h-4 rounded-full ${active ? 'bg-soc-cyan' : 'bg-transparent'}`} />
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-soc-cyan' : 'text-soc-textDim'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-soc-border">
        <button
          onClick={onOpenSettings}
          className="w-full h-8 px-2 rounded-md flex items-center gap-2 text-[13px] text-soc-textMuted hover:text-soc-text hover:bg-soc-card transition-colors duration-200"
        >
          <Settings className="w-3.5 h-3.5 text-soc-textDim" />
          Settings
        </button>
        <p className="px-2 pt-2 text-[10px] leading-relaxed text-soc-textDim">
          Simulated hosts only. RFC 5737 addresses. Nothing here scans a real network.
        </p>
      </div>
    </aside>
  );
}

export function MobileNav({ activeTab, setActiveTab }: Omit<SidebarProps, 'onOpenSettings'>) {
  return (
    <div className="md:hidden flex gap-1 overflow-x-auto px-3 py-2 border-b border-soc-border bg-soc-sidebar">
      {NAV.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          aria-current={activeTab === item.id ? 'page' : undefined}
          className={`shrink-0 h-7 px-2.5 rounded-md text-[12px] transition-colors duration-200 ${
            activeTab === item.id ? 'bg-soc-elevated text-soc-text' : 'text-soc-textMuted'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
