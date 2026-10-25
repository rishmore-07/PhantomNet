import { X } from 'lucide-react';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  eventCount: number;
  onReset: () => void;
}

export function SettingsDrawer({ open, onClose, sessionId, eventCount, onReset }: SettingsDrawerProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50">
      <button className="flex-1 cursor-default" aria-label="Close settings" onClick={onClose} />
      <aside className="w-full max-w-sm h-full bg-soc-sidebar border-l border-soc-border p-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] text-soc-text">Settings</h2>
          <button onClick={onClose} aria-label="Close" className="text-soc-textDim hover:text-soc-text">
            <X className="w-4 h-4" />
          </button>
        </div>
        <dl className="mt-4 space-y-2 text-[12px]">
          <div className="flex justify-between gap-3">
            <dt className="text-soc-textDim">Session</dt>
            <dd className="font-mono text-soc-text truncate">{sessionId}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-soc-textDim">Recorded events</dt>
            <dd className="font-mono text-soc-text">{eventCount}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-soc-textDim">Storage</dt>
            <dd className="font-mono text-soc-text">local v2</dd>
          </div>
        </dl>
        <p className="mt-4 text-[12px] leading-relaxed text-soc-textMuted">
          The session is stored in this browser only. Refresh keeps it. Reset clears both the current key and the
          previous v1 key. This is not an audit log.
        </p>
        <button
          onClick={() => {
            onReset();
            onClose();
          }}
          className="mt-4 h-8 px-3 rounded-md border border-soc-border text-[12px] text-soc-text hover:bg-soc-elevated transition-colors duration-200"
        >
          Reset simulation
        </button>
      </aside>
    </div>
  );
}
