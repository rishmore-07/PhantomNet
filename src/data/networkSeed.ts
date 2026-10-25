import { NetworkNodeDef, NetworkEdgeDef } from '../domain/types';

export const INITIAL_NODES: NetworkNodeDef[] = [
  {
    id: 'gateway',
    label: 'Perimeter Gateway',
    ip: '192.0.2.10',
    role: 'Perimeter / Ingress',
    description: 'Edge reverse proxy, SSL termination, and perimeter ingress filter.',
    isDecoy: false,
    tags: ['Ingress', 'Reverse-Proxy', 'Edge'],
    os: 'Linux Alpine 3.19 (Hardened)',
    services: ['HTTPS (443)', 'SSH (22 - Restricted)', 'BGP (179)'],
    position: { x: 24, y: 150 },
  },
  {
    id: 'web',
    label: 'Corporate Web Server',
    ip: '192.0.2.20',
    role: 'Application Cluster',
    description: 'Hosts customer portal and internal operational web applications.',
    isDecoy: false,
    tags: ['App', 'DMZ', 'Public-Facing'],
    os: 'Ubuntu 24.04 LTS',
    services: ['Nginx 1.25', 'Node.js runtime', 'Decoy Route /admin'],
    position: { x: 250, y: 24 },
  },
  {
    id: 'workstation',
    label: 'SecOps Workstation',
    ip: '192.0.2.30',
    role: 'Staff Endpoint',
    description: 'Corporate staff laptop with internal VPN and engineering credentials.',
    isDecoy: false,
    tags: ['Endpoint', 'Corp-LAN', 'User-Session'],
    os: 'macOS Sonoma 14.4 (Simulated)',
    services: ['MDM Agent', 'EDR Sensor', 'Local SSH Agent'],
    position: { x: 250, y: 230 },
  },
  {
    id: 'finance',
    label: 'Finance Core Server',
    ip: '192.0.2.40',
    role: 'Restricted Storage',
    description: 'Hosts sensitive payroll, quarterly filings, and executive forecasts.',
    isDecoy: false,
    tags: ['PCI-DSS', 'High-Value', 'Internal'],
    os: 'RHEL 9.3',
    services: ['SMB / CIFS (445)', 'NFS (2049)', 'Audit Daemon'],
    position: { x: 480, y: 24 },
  },
  {
    id: 'database',
    label: 'Primary SQL Cluster',
    ip: '192.0.2.50',
    role: 'Relational Database',
    description: 'Central database containing customer records and transaction logs.',
    isDecoy: false,
    tags: ['Storage', 'PostgreSQL', 'Encrypted-At-Rest'],
    os: 'Debian 12 Bookworm',
    services: ['PostgreSQL 16 (5432)', 'pg_stat_monitor', 'Local Backup Agent'],
    position: { x: 480, y: 230 },
  },
  {
    id: 'decoy-vault',
    label: 'Deception HoneyVault',
    ip: '192.0.2.60',
    role: 'Deception Trap',
    description: 'High-interaction decoy host seeded with synthetic root credentials and honeytokens.',
    isDecoy: true,
    tags: ['HONEYPOT', 'TRAP-NODE', 'HIGH-INTERACTION'],
    os: 'Simulated Deception Kernel v4.2',
    services: ['Simulated Telnet (23)', 'Fake Hashicorp Vault (8200)', 'HoneyToken Emitter'],
    coverLabel: 'Cold Archive',
    coverRole: 'Backup Storage',
    coverDescription: 'Secondary archive for database snapshots and file restores.',
    coverOs: 'Debian 12 Bookworm',
    coverServices: ['SSH (22)', 'NFS (2049)', 'Backup Agent'],
    position: { x: 710, y: 128 },
  },
];

export const INITIAL_EDGES: NetworkEdgeDef[] = [
  { id: 'e-gw-web', source: 'gateway', target: 'web', label: 'HTTP / 443' },
  { id: 'e-gw-ws', source: 'gateway', target: 'workstation', label: 'VPN / WireGuard' },
  { id: 'e-web-ws', source: 'web', target: 'workstation', label: 'Internal LAN' },
  { id: 'e-web-fin', source: 'web', target: 'finance', label: 'RPC / Rest' },
  { id: 'e-web-db', source: 'web', target: 'database', label: 'PostgreSQL / 5432' },
  { id: 'e-ws-fin', source: 'workstation', target: 'finance', label: 'SMB / 445' },
  { id: 'e-fin-db', source: 'finance', target: 'database', label: 'ETL Batch' },
  { id: 'e-fin-vault', source: 'finance', target: 'decoy-vault', label: 'Backup Sync' },
  { id: 'e-db-vault', source: 'database', target: 'decoy-vault', label: 'Cold Archive' },
];

/**
 * Returns allowed next-hop node IDs from current node ID
 */
export function getAllowedTransitions(currentNodeId: string): string[] {
  const neighbors = new Set<string>();
  for (const edge of INITIAL_EDGES) {
    if (edge.source === currentNodeId) neighbors.add(edge.target);
    if (edge.target === currentNodeId) neighbors.add(edge.source);
  }
  return Array.from(neighbors);
}
