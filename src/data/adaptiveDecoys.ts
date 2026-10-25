import { AssetKind } from '../domain/types';

export interface AdaptiveTemplate {
  id: string;
  policyId: string;
  kind: AssetKind;
  label: string;
  honeytokenId: string;
  preview: string;
  metadata: Record<string, string>;
}

/**
 * Decoys that are not in the baseline environment.
 * They appear only after a DECOY_DEPLOYED event selects them.
 */
export const ADAPTIVE_TEMPLATES: AdaptiveTemplate[] = [
  {
    id: 'adaptive-recon-metrics',
    policyId: 'policy-repeated-recon',
    kind: 'endpoint',
    label: '/metrics/node_exporter',
    honeytokenId: 'HT-ADAPT-RECON-2401',
    preview: `HTTP/1.1 200 OK
Content-Type: text/plain

# TYPE node_cpu_seconds_total counter
node_cpu_seconds_total{cpu="0",mode="idle"} 10244.2
node_filesystem_avail_bytes{mountpoint="/var"} 8.4e10
# document control 2401`,
    metadata: {
      method: 'GET',
      route: '/metrics/node_exporter',
      classification: 'INTERNAL-TELEMETRY',
    },
  },
  {
    id: 'adaptive-access-review',
    policyId: 'policy-restricted-segment',
    kind: 'file',
    label: 'access_review_Q3.csv',
    honeytokenId: 'HT-ADAPT-SEG-2402',
    preview: `account,role,last_review,owner
svc_ledger_reader,finance-ro,2026-09-12,finops
svc_archive,backup,2026-08-02,platform
analyst.soc,ir-read,2026-10-01,secops
# document control 2402`,
    metadata: {
      fileSize: '12.4 KB',
      author: 'iam-export',
      classification: 'INTERNAL',
    },
  },
  {
    id: 'adaptive-ledger-cred',
    policyId: 'policy-finance-credential',
    kind: 'credential',
    label: 'svc_ledger_reader.env',
    honeytokenId: 'HT-ADAPT-FIN-2403',
    preview: `DB_HOST=192.0.2.50
DB_PORT=5432
DB_USER=svc_ledger_reader
DB_PASSWORD=DEMO_ONLY_NOT_VALID_LedgerReader#2403
# document control 2403`,
    metadata: {
      credentialType: 'Service account',
      scope: 'Ledger read replica',
      classification: 'RESTRICTED',
    },
  },
  {
    id: 'adaptive-restore-notes',
    policyId: 'policy-credential-follow',
    kind: 'file',
    label: 'db_restore_runbook.txt',
    honeytokenId: 'HT-ADAPT-CRED-2404',
    preview: `Restore order
1. Stop writers on 192.0.2.50
2. Mount cold archive snapshot
3. Apply WAL through 2026-10-20 03:00 UTC
4. Service account: svc_ledger_reader
# document control 2404`,
    metadata: {
      fileSize: '3.1 KB',
      author: 'dba-oncall',
      classification: 'INTERNAL',
    },
  },
  {
    id: 'adaptive-cached-keys',
    policyId: 'policy-auth-spray',
    kind: 'credential',
    label: 'id_ed25519.pub.bak',
    honeytokenId: 'HT-ADAPT-AUTH-2405',
    preview: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDEMOONLYNOTVALIDKEY2405 ops-breakglass@phantomnet.demo
# document control 2405`,
    metadata: {
      credentialType: 'Public key backup',
      scope: 'Host access',
      classification: 'INTERNAL',
    },
  },
];

export function templateById(id: string): AdaptiveTemplate | undefined {
  return ADAPTIVE_TEMPLATES.find((template) => template.id === id);
}

export function templateByPolicy(policyId: string): AdaptiveTemplate | undefined {
  return ADAPTIVE_TEMPLATES.find((template) => template.policyId === policyId);
}
