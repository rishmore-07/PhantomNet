import { appendSimulationEvent, createInitialSession, PerformActionParams } from './simulation';
import { SimulationSession } from './types';

export const GOLDEN_ACTIONS: PerformActionParams[] = [
  { type: 'SCAN_HOST', targetNodeId: 'gateway' },
  { type: 'LATERAL_MOVE_ATTEMPT', targetNodeId: 'web' },
  { type: 'SCAN_HOST', targetNodeId: 'web' },
  { type: 'BROWSE_DIRECTORY', targetNodeId: 'web' },
  { type: 'LATERAL_MOVE_ATTEMPT', targetNodeId: 'finance' },
  {
    type: 'SENSITIVE_FILE_OPENED',
    targetNodeId: 'finance',
    assetId: 'asset-payroll-file',
  },
  { type: 'LATERAL_MOVE_ATTEMPT', targetNodeId: 'decoy-vault' },
  {
    type: 'HONEYTOKEN_VIEWED',
    targetNodeId: 'decoy-vault',
    assetId: 'asset-admin-token',
  },
  { type: 'LATERAL_MOVE_ATTEMPT', targetNodeId: 'database' },
  {
    type: 'FAKE_CREDENTIAL_USED',
    targetNodeId: 'database',
    customExplanation:
      'Simulated authentication attempt presented the synthetic credential to the database host.',
  },
];

/** Records the judge scenario through the same reducer used by manual actions. */
export function runGoldenScenario(): SimulationSession {
  let session = createInitialSession();
  for (const action of GOLDEN_ACTIONS) {
    const result = appendSimulationEvent(session, action);
    if (!result.success) {
      throw new Error(result.message);
    }
    session = result.updatedSession;
  }
  return session;
}
