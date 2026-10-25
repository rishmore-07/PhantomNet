import { useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNetworkNode, CustomNodeData } from './CustomNetworkNode';
import { INITIAL_NODES, INITIAL_EDGES } from '../../data/networkSeed';
import { NodeId, NodeStatus } from '../../domain/types';
import { Perspective } from '../../hooks/useSimulationStore';
import { presentHost } from '../../domain/presentation';

interface NetworkGraphProps {
  currentNodeId: NodeId;
  selectedNodeId: NodeId | null;
  setSelectedNodeId: (id: NodeId) => void;
  nodeStatuses: Record<NodeId, NodeStatus>;
  attackPath: {
    visitedNodeIds: Set<NodeId>;
    traversedEdgeIds: Set<string>;
    attemptedEdgeIds: Set<string>;
    blockedEdgeIds: Set<string>;
    steps: Array<{ fromNodeId?: NodeId; toNodeId: NodeId; outcome?: string }>;
  };
  perspective: Perspective;
  adaptiveNodeIds: NodeId[];
}

const nodeTypes = { customNode: CustomNetworkNode };

function FitGraph() {
  const { fitView } = useReactFlow();
  const lastWidth = useRef(0);
  useEffect(() => {
    const pane = document.querySelector('.react-flow');
    if (!pane) return;
    const fit = () => {
      const width = pane.clientWidth;
      if (width < 240 || Math.abs(width - lastWidth.current) < 48) return;
      lastWidth.current = width;
      fitView({ padding: 0.18, duration: 0 });
    };
    const observer = new ResizeObserver(() => window.setTimeout(fit, 60));
    observer.observe(pane);
    const timer = window.setTimeout(fit, 140);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [fitView]);
  return null;
}

export function NetworkGraph({
  currentNodeId,
  selectedNodeId,
  setSelectedNodeId,
  nodeStatuses,
  attackPath,
  perspective,
  adaptiveNodeIds,
}: NetworkGraphProps) {
  const nodes: Node<CustomNodeData>[] = useMemo(() => {
    return INITIAL_NODES.map((def) => {
      const host = presentHost(def, perspective);
      return {
        id: def.id,
        type: 'customNode',
        position: def.position,
        width: 200,
        height: 96,
        data: {
          id: def.id,
          label: host.label,
          ip: def.ip,
          role: host.role,
          status: nodeStatuses[def.id] || 'healthy',
          showSecurity: perspective === 'defender',
          isCurrent: currentNodeId === def.id,
          isSelected: selectedNodeId === def.id,
          decoyHost: def.isDecoy,
          adaptive: adaptiveNodeIds.includes(def.id),
        },
        draggable: false,
      };
    });
  }, [nodeStatuses, currentNodeId, perspective, selectedNodeId, adaptiveNodeIds]);

  const edges: Edge[] = useMemo(() => {
    const succeededSteps = attackPath.steps.filter((step) => !step.outcome || step.outcome === 'succeeded');
    const last = succeededSteps[succeededSteps.length - 1];
    return INITIAL_EDGES.map((edgeDef) => {
      const traversed = attackPath.traversedEdgeIds.has(edgeDef.id);
      const attempted = attackPath.attemptedEdgeIds.has(edgeDef.id);
      const blocked = attackPath.blockedEdgeIds.has(edgeDef.id);
      const latest = Boolean(
        traversed &&
          last?.fromNodeId &&
          ((edgeDef.source === last.fromNodeId && edgeDef.target === last.toNodeId) ||
            (edgeDef.source === last.toNodeId && edgeDef.target === last.fromNodeId))
      );
      const base = {
        id: edgeDef.id,
        source: edgeDef.source,
        target: edgeDef.target,
        type: 'smoothstep' as const,
      };

      if (traversed) {
        return {
          ...base,
          animated: Boolean(latest),
          style: { stroke: '#F87171', strokeWidth: latest ? 1.8 : 1.4 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#F87171', width: 14, height: 14 },
        };
      }
      if (attempted) {
        return {
          ...base,
          style: { stroke: '#FBBF24', strokeWidth: 1.4, strokeDasharray: '5 4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#FBBF24', width: 12, height: 12 },
        };
      }
      if (blocked) {
        return {
          ...base,
          style: { stroke: '#64748B', strokeWidth: 1.2, strokeDasharray: '2 4' },
        };
      }
      return { ...base, style: { stroke: '#263244', strokeWidth: 1 } };
    });
  }, [attackPath]);

  return (
    <div className="w-full h-full min-h-[360px] relative bg-soc-bg rounded-lg border border-soc-border overflow-hidden">
      <div className="absolute bottom-2 left-12 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded-md border border-soc-border bg-soc-card/95 px-2 py-1.5 text-[10px] text-soc-textMuted max-w-[70%]">
        {perspective === 'defender' ? (
          <>
            <span>Simulated status</span>
            <span className="inline-flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-soc-green" /> Intact</span>
            <span className="inline-flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-soc-amber" /> Suspicious</span>
            <span className="inline-flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-soc-red" /> Decoy touched</span>
            <span className="inline-flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-sm bg-soc-cyan" /> Staged decoy</span>
            <span className="inline-flex items-center gap-1"><i className="w-3 h-px bg-[#F87171]" /> Session moved</span>
            <span className="inline-flex items-center gap-1"><i className="w-3 border-t border-dashed border-[#FBBF24]" /> Attempted</span>
            <span className="inline-flex items-center gap-1"><i className="w-3 border-t border-dotted border-[#64748B]" /> Blocked</span>
          </>
        ) : (
          <span>Solid path: session moved. Amber dash: attempt only. Gray dash: blocked route. Detection markers stay hidden here.</span>
        )}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_, node) => setSelectedNodeId(node.id as NodeId)}
        proOptions={{ hideAttribution: true }}
        minZoom={0.45}
        maxZoom={1.6}
      >
        <FitGraph />
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#263244" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
