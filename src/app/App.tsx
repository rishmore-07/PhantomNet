import { useEffect } from 'react';
import { useSimulationStore } from '../hooks/useSimulationStore';
import { Sidebar, MobileNav } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { ReplayBar } from '../components/layout/ReplayBar';
import { KpiCards } from '../components/layout/KpiCards';
import { SettingsDrawer } from '../components/layout/SettingsDrawer';
import { ActivityChart, DeceptionPanel, EventFeed, PriorityAlerts } from '../components/overview/OverviewTab';
import { NetworkGraph } from '../components/network/NetworkGraph';
import { NodeDetailsPanel } from '../components/network/NodeDetailsPanel';
import { AttackerConsole } from '../components/simulation/AttackerConsole';
import { AssetPreviewModal } from '../components/simulation/AssetPreviewModal';
import { AlertsPanel } from '../components/incidents/AlertsPanel';
import { TimelineView } from '../components/incidents/TimelineView';
import { IncidentReportView } from '../components/incidents/IncidentReportView';
import { ThreatIntelView } from '../components/intel/ThreatIntelView';
import { interactionForAsset } from '../domain/assets';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function App() {
  const store = useSimulationStore();
  const {
    session,
    recordedEventCount,
    selectedNodeId,
    setSelectedNodeId,
    activeTab,
    setActiveTab,
    perspective,
    setPerspective,
    activeAssetPreview,
    setActiveAssetPreview,
    statusMessage,
    dismissStatus,
    replay,
    actionsLocked,
    cursorEvent,
    alerts,
    threatScore,
    threatLevel,
    attackPath,
    nodeStatuses,
    deployments,
    incidentReport,
    visibleAssets,
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
  } = store;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === ' ') {
        event.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, togglePlay]);

  const downloadReport = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(incidentReport, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `phantomnet-incident-${incidentReport.sessionId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const adaptiveNodeIds = deployments
    .filter((item) => item.origin === 'adaptive')
    .map((item) => item.nodeId);

  const graph = (
    <NetworkGraph
      currentNodeId={session.currentNodeId}
      selectedNodeId={selectedNodeId}
      setSelectedNodeId={setSelectedNodeId}
      nodeStatuses={nodeStatuses}
      attackPath={attackPath}
      perspective={perspective}
      adaptiveNodeIds={adaptiveNodeIds}
    />
  );

  return (
    <div className="h-full flex bg-soc-bg text-soc-text">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onOpenSettings={() => setSettingsOpen(true)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          perspective={perspective}
          setPerspective={setPerspective}
          sessionId={session.id}
          currentNodeId={session.currentNodeId}
          alertCount={alerts.length}
          replaying={replay.active}
          onOpenIncidents={() => setActiveTab('incidents')}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <ReplayBar
          index={replay.index}
          total={recordedEventCount}
          playing={replay.playing}
          active={replay.active}
          onToggle={togglePlay}
          onStep={step}
          onScrub={scrub}
          onResetPlayback={resetReplay}
          onLive={returnToLive}
          onDemonstrate={runScriptedDemo}
          onResetSession={resetSimulation}
        />

        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 md:p-4 space-y-3">
          {activeTab === 'overview' && (
            <>
              <KpiCards
                threatScore={threatScore}
                threatLevel={threatLevel}
                currentNodeId={session.currentNodeId}
                totalAlerts={alerts.length}
                criticalAlerts={alerts.filter((alert) => alert.severity === 'critical').length}
                adaptiveCount={deployments.filter((item) => item.origin === 'adaptive').length}
                touchedDecoys={incidentReport.triggeredDecoys.length}
                eventsCount={session.events.length}
                concealDefense={perspective === 'attacker'}
              />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-8 h-[420px] lg:h-[460px]">{graph}</div>
                <div className="lg:col-span-4 lg:h-[460px]">
                  <EventFeed
                    events={session.events}
                    perspective={perspective}
                    onOpenIncidents={() => setActiveTab('incidents')}
                  />
                </div>
                <div className="lg:col-span-4">
                  <ActivityChart events={session.events} perspective={perspective} />
                </div>
                <div className="lg:col-span-4">
                  <PriorityAlerts alerts={alerts} perspective={perspective} />
                </div>
                <div className="lg:col-span-4">
                  <DeceptionPanel deployments={deployments} perspective={perspective} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'network' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:h-[calc(100vh-8.5rem)]">
              <div className="lg:col-span-8 min-h-[420px]">{graph}</div>
              <div className="lg:col-span-4 min-h-[420px]">
                {selectedNodeId ? (
                  <NodeDetailsPanel
                    session={session}
                    selectedNodeId={selectedNodeId}
                    currentNodeId={session.currentNodeId}
                    nodeStatuses={nodeStatuses}
                    deployments={deployments}
                    perspective={perspective}
                    actionsLocked={actionsLocked}
                    onOpenAssetPreview={setActiveAssetPreview}
                    onPerformAction={performAction}
                  />
                ) : (
                  <div className="h-full border border-dashed border-soc-border rounded-lg grid place-items-center text-[12px] text-soc-textDim p-6 text-center">
                    Select a host to inspect its directory and routes.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'simulator' && (
            <AttackerConsole
              currentNodeId={session.currentNodeId}
              events={session.events}
              assets={visibleAssets}
              deployments={deployments}
              perspective={perspective}
              actionsLocked={actionsLocked}
              onPerformAction={performAction}
              onOpenAssetPreview={setActiveAssetPreview}
            />
          )}

          {activeTab === 'intel' && <ThreatIntelView report={incidentReport} />}

          {activeTab === 'incidents' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <AlertsPanel alerts={alerts} />
              <TimelineView events={session.events} activeEventId={cursorEvent?.id} />
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={downloadReport}
                  className="h-8 px-3 rounded-md bg-soc-cyan text-[#08202c] text-[12px] font-medium"
                >
                  Export JSON
                </button>
              </div>
              <IncidentReportView report={incidentReport} />
            </div>
          )}
        </main>
      </div>

      {statusMessage && (
        <div
          className={`fixed bottom-4 right-4 z-50 max-w-sm border rounded-md px-3 py-2 text-[12px] shadow-panel flex items-start gap-2 ${
            statusMessage.type === 'error'
              ? 'bg-[#1a1214] border-soc-red/40 text-soc-red'
              : statusMessage.type === 'success'
              ? 'bg-[#10201b] border-soc-green/30 text-soc-green'
              : 'bg-soc-card border-soc-border text-soc-text'
          }`}
        >
          {statusMessage.type === 'error' ? (
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          ) : statusMessage.type === 'success' ? (
            <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          ) : (
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
          <button onClick={dismissStatus} className="ml-2 text-soc-textDim" aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <AssetPreviewModal
        asset={activeAssetPreview}
        currentNodeId={session.currentNodeId}
        perspective={perspective}
        onClose={() => setActiveAssetPreview(null)}
        onInteract={(asset) => performAction(interactionForAsset(asset))}
      />

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        sessionId={session.id}
        eventCount={recordedEventCount}
        onReset={resetSimulation}
      />
    </div>
  );
}
