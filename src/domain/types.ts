export type NodeId = 
  | 'gateway' 
  | 'web' 
  | 'workstation' 
  | 'finance' 
  | 'database' 
  | 'decoy-vault';

export type NodeStatus = 'healthy' | 'suspicious' | 'triggered';

export type AssetKind = 'file' | 'credential' | 'endpoint';

export interface DecoyAsset {
  id: string;
  nodeId: NodeId;
  kind: AssetKind;
  label: string;
  honeytokenId: string;
  preview: string;
  isHoneytoken: boolean;
  metadata?: Record<string, string>;
}

export interface NetworkNodeDef {
  id: NodeId;
  label: string;
  ip: string;
  role: string;
  description: string;
  isDecoy: boolean;
  tags: string[];
  os: string;
  services: string[];
  position: { x: number; y: number };
  /** Attacker-facing label when the true role would reveal a decoy host. */
  coverLabel?: string;
  coverRole?: string;
  coverDescription?: string;
  coverOs?: string;
  coverServices?: string[];
}

export interface NetworkEdgeDef {
  id: string;
  source: NodeId;
  target: NodeId;
  label?: string;
  bidirectional?: boolean;
}

export type EventType =
  | 'SESSION_STARTED'
  | 'SCAN_HOST'
  | 'BROWSE_DIRECTORY'
  | 'LOGIN_FAILED'
  | 'SENSITIVE_FILE_OPENED'
  | 'HONEYTOKEN_VIEWED'
  | 'FAKE_CREDENTIAL_USED'
  | 'LATERAL_MOVE_ATTEMPT'
  | 'DECOY_DEPLOYED';

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface IntrusionEvent {
  id: string;
  sessionId: string;
  timestamp: string; // ISO 8601
  type: EventType;
  actor: 'simulated-attacker' | 'system';
  sourceNodeId?: NodeId;
  targetNodeId?: NodeId;
  assetId?: string;
  assetLabel?: string;
  severity: Severity;
  scoreDelta: number;
  explanation: string;
  evidence?: string;
  honeytokenId?: string;
  /** Set only on DECOY_DEPLOYED events emitted by the policy engine. */
  policyId?: string;
  deploymentReason?: string;
}

export interface Alert {
  id: string;
  eventId: string;
  timestamp: string;
  severity: Severity;
  title: string;
  nodeId: NodeId;
  assetId?: string;
  honeytokenId?: string;
  evidence: string;
  description: string;
}

export interface SimulationSession {
  id: string;
  startedAt: string;
  currentNodeId: NodeId;
  events: IntrusionEvent[];
}

export interface AttackPathStep {
  fromNodeId?: NodeId;
  toNodeId: NodeId;
  timestamp: string;
  eventId: string;
  type: EventType;
}

export interface IncidentReport {
  sessionId: string;
  generatedAt: string;
  startedAt: string;
  durationSeconds: number;
  threatScore: number;
  classification: string;
  summary: string;
  currentNode: NodeId;
  totalEvents: number;
  alertCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  attackTrajectory: NodeId[];
  triggeredDecoys: Array<{
    assetId: string;
    assetLabel: string;
    honeytokenId: string;
    nodeId: NodeId;
    touchedAt: string;
  }>;
  timeline: IntrusionEvent[];
  alerts: Alert[];
  recommendations: string[];
  scopeNotice: string;
  scoreBreakdown: ScoreComponent[];
  mitreMappings: MitreMappingRecord[];
  unmappedEvents: UnmappedEventRecord[];
  adaptiveDeployments: AdaptiveDeploymentRecord[];
  /** Null when the report covers the full recorded session. */
  replayView: {
    eventIndex: number;
    eventsIncluded: number;
    eventsRecorded: number;
    note: string;
  } | null;
}

export interface ScoreComponent {
  eventType: EventType;
  count: number;
  deltaEach: number;
  subtotal: number;
}

export interface MitreMappingRecord {
  eventId: string;
  eventType: EventType;
  timestamp: string;
  tacticId: string;
  tacticName: string;
  techniqueId: string;
  techniqueName: string;
  evidence: string;
  detectionExplanation: string;
}

export interface UnmappedEventRecord {
  eventId: string;
  eventType: EventType;
  reason: string;
}

export interface AdaptiveDeploymentRecord {
  assetId: string;
  assetLabel: string;
  nodeId: NodeId;
  honeytokenId: string;
  kind: AssetKind;
  policyId: string;
  reason: string;
  deployedAt: string;
  eventId: string;
}

export interface DecoyDeploymentRecord {
  assetId: string;
  assetLabel: string;
  nodeId: NodeId;
  honeytokenId: string;
  kind: AssetKind;
  origin: 'baseline' | 'adaptive';
  reason: string;
  policyId?: string;
  deployedAt: string;
  eventId?: string;
}
