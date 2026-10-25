import { useState, useEffect, useCallback, useMemo } from 'react';
import { DecoyAsset, NodeId, SimulationSession } from '../domain/types';
import {
  createInitialSession,
  appendSimulationEvent,
  PerformActionParams,
} from '../domain/simulation';
import {
  deriveAlerts,
  deriveThreatScore,
  deriveThreatLevel,
  deriveAttackPath,
  deriveNodeStatuses,
  deriveIncidentReport,
  deriveDecoyDeployments,
} from '../domain/selectors';
import { assetsOnNode } from '../domain/assets';
import { runGoldenScenario } from '../domain/demoScript';
import { LEGACY_STORAGE_KEY, STORAGE_KEY, sanitizeSession } from '../domain/persistence';
import { projectSessionAt } from '../domain/replay';

export type Perspective = 'defender' | 'attacker';
export type ActiveTab = 'overview' | 'network' | 'simulator' | 'intel' | 'incidents' | 'reports';

export interface ReplayState {
  active: boolean;
  index: number;
  playing: boolean;
}

const REPLAY_MS = 800;

function loadSession(): SimulationSession {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (saved) {
      const sanitized = sanitizeSession(JSON.parse(saved));
      if (sanitized) return sanitized;
    }
  } catch (error) {
    console.warn('Could not restore session from localStorage:', error);
  }
  return createInitialSession();
}

export function useSimulationStore() {
  const [session, setSession] = useState<SimulationSession>(loadSession);
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>('gateway');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [perspective, setPerspective] = useState<Perspective>('defender');
  const [activeAssetPreview, setActiveAssetPreview] = useState<DecoyAsset | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [replay, setReplay] = useState<ReplayState>({ active: false, index: 0, playing: false });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to save session to localStorage:', error);
    }
  }, [session]);

  const viewSession = useMemo(
    () => (replay.active ? projectSessionAt(session, replay.index) : session),
    [session, replay.active, replay.index]
  );

  const alerts = useMemo(() => deriveAlerts(viewSession), [viewSession]);
  const threatScore = useMemo(() => deriveThreatScore(viewSession), [viewSession]);
  const threatLevel = useMemo(() => deriveThreatLevel(viewSession), [viewSession]);
  const attackPath = useMemo(() => deriveAttackPath(viewSession), [viewSession]);
  const nodeStatuses = useMemo(() => deriveNodeStatuses(viewSession), [viewSession]);
  const deployments = useMemo(() => deriveDecoyDeployments(viewSession), [viewSession]);
  const incidentReport = useMemo(
    () =>
      deriveIncidentReport(viewSession, {
        recordedEventCount: session.events.length,
        viewingIndex: replay.active ? replay.index : null,
      }),
    [viewSession, session.events.length, replay.active, replay.index]
  );

  const showNotification = useCallback((text: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage({ text, type });
    window.setTimeout(() => {
      setStatusMessage((current) => (current?.text === text ? null : current));
    }, 4200);
  }, []);

  const performAction = useCallback(
    (params: PerformActionParams) => {
      if (replay.active) {
        showNotification('Playback is active. Return to the live session before recording a new action.', 'info');
        return false;
      }
      let outcome: { success: boolean; message: string; move?: 'attempted' | 'blocked' | 'succeeded' } | null = null;
      setSession((current) => {
        const result = appendSimulationEvent(current, params);
        outcome = { success: result.success, message: result.message, move: result.outcome };
        return result.updatedSession;
      });
      if (outcome) {
        const { success, message, move } = outcome;
        const tone = move === 'attempted' ? 'info' : move === 'blocked' || !success ? 'error' : 'success';
        showNotification(message, tone);
        return success;
      }
      return false;
    },
    [replay.active, showNotification]
  );

  const resetSimulation = useCallback(() => {
    setSession(createInitialSession());
    setSelectedNodeId('gateway');
    setActiveAssetPreview(null);
    setReplay({ active: false, index: 0, playing: false });
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    showNotification('Simulation reset. A new session is ready.', 'info');
  }, [showNotification]);

  const returnToLive = useCallback(() => {
    setReplay({ active: false, index: Math.max(0, session.events.length - 1), playing: false });
  }, [session.events.length]);

  const scrub = useCallback(
    (index: number) => {
      const last = Math.max(0, session.events.length - 1);
      const next = Math.max(0, Math.min(index, last));
      setReplay({ active: true, index: next, playing: false });
    },
    [session.events.length]
  );

  const step = useCallback(
    (direction: -1 | 1) => {
      setReplay((current) => {
        const last = Math.max(0, session.events.length - 1);
        const base = current.active ? current.index : last;
        const next = Math.max(0, Math.min(base + direction, last));
        return { active: true, index: next, playing: false };
      });
    },
    [session.events.length]
  );

  const togglePlay = useCallback(() => {
    setReplay((current) => {
      const last = Math.max(0, session.events.length - 1);
      if (current.playing) return { ...current, playing: false };
      if (!current.active || current.index >= last) {
        return { active: true, index: 0, playing: last > 0 };
      }
      return { ...current, active: true, playing: true };
    });
  }, [session.events.length]);

  const resetReplay = useCallback(() => {
    setReplay({ active: true, index: 0, playing: false });
    setSelectedNodeId('gateway');
  }, []);

  const runScriptedDemo = useCallback(() => {
    const recorded = runGoldenScenario();
    setSession(recorded);
    setSelectedNodeId('gateway');
    setActiveAssetPreview(null);
    setPerspective('defender');
    setActiveTab('overview');
    setReplay({ active: true, index: 0, playing: true });
    showNotification('Demonstration recorded. Playback is using that event log.', 'success');
  }, [showNotification]);

  useEffect(() => {
    if (!replay.playing) return;
    const timer = window.setInterval(() => {
      setReplay((current) => {
        if (!current.playing) return current;
        const last = session.events.length - 1;
        if (current.index >= last) return { ...current, playing: false };
        return { ...current, index: current.index + 1 };
      });
    }, REPLAY_MS);
    return () => window.clearInterval(timer);
  }, [replay.playing, session.events.length]);

  useEffect(() => {
    if (!replay.active) return;
    const event = session.events[replay.index];
    if (event?.targetNodeId) setSelectedNodeId(event.targetNodeId);
  }, [replay.active, replay.index, session.events]);

  const cursorEvent = replay.active ? session.events[replay.index] : session.events[session.events.length - 1];

  return {
    session: viewSession,
    recordedEventCount: session.events.length,
    selectedNodeId,
    setSelectedNodeId,
    activeTab,
    setActiveTab,
    perspective,
    setPerspective,
    activeAssetPreview,
    setActiveAssetPreview,
    statusMessage,
    dismissStatus: () => setStatusMessage(null),
    replay,
    actionsLocked: replay.active,
    cursorEvent,
    alerts,
    threatScore,
    threatLevel,
    attackPath,
    nodeStatuses,
    deployments,
    incidentReport,
    visibleAssets: assetsOnNode(viewSession, viewSession.currentNodeId),
    performAction,
    resetSimulation,
    runScriptedDemo,
    togglePlay,
    step,
    scrub,
    resetReplay,
    returnToLive,
    settingsOpen,
    setSettingsOpen,
  };
}
