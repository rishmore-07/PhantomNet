import { describe, it, expect } from 'vitest';
import {
  createInitialSession,
  appendSimulationEvent,
  validateAction,
} from '../src/domain/simulation';
import { calculateThreatScore, THREAT_RULES } from '../src/domain/rules';
import {
  deriveAlerts,
  deriveThreatScore,
  deriveAttackPath,
  deriveNodeStatuses,
  deriveIncidentReport,
} from '../src/domain/selectors';

describe('PHANTOMNET Simulation Engine', () => {
  it('initializes a session at gateway with one initial event', () => {
    const session = createInitialSession();
    expect(session.currentNodeId).toBe('gateway');
    expect(session.events.length).toBe(1);
    expect(session.events[0].type).toBe('SESSION_STARTED');
    expect(deriveThreatScore(session)).toBe(0);
  });

  it('rejects impossible lateral movement not adjacent in graph', () => {
    const session = createInitialSession();
    // Gateway -> Database is not a direct link
    const validation = validateAction(session, {
      type: 'LATERAL_MOVE_ATTEMPT',
      targetNodeId: 'database',
    });
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('blocked by network routing segmentation');

    const result = appendSimulationEvent(session, {
      type: 'LATERAL_MOVE_ATTEMPT',
      targetNodeId: 'database',
    });
    expect(result.success).toBe(false);
    expect(result.outcome).toBe('blocked');
    expect(result.updatedSession.currentNodeId).toBe('gateway');
    expect(result.updatedSession.events).toHaveLength(2);
    expect(result.updatedSession.events[1].outcome).toBe('blocked');
    const path = deriveAttackPath(result.updatedSession);
    expect(path.pathNodes).toEqual(['gateway']);
    expect(path.traversedEdgeIds.size).toBe(0);
  });

  it('permits valid adjacent movement and records event', () => {
    let session = createInitialSession();
    // Gateway -> Web Server is allowed
    const result = appendSimulationEvent(session, {
      type: 'LATERAL_MOVE_ATTEMPT',
      targetNodeId: 'web',
    });
    expect(result.success).toBe(true);
    expect(result.outcome).toBe('succeeded');
    session = result.updatedSession;
    expect(session.currentNodeId).toBe('web');
    expect(session.events.length).toBe(2);

    const alerts = deriveAlerts(session);
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe('medium');
    expect(deriveThreatScore(session)).toBe(8);
  });

  it('rejects opening decoy file if attacker is not on the hosting node', () => {
    const session = createInitialSession(); // at gateway
    // asset-payroll-file is on finance server
    const validation = validateAction(session, {
      type: 'SENSITIVE_FILE_OPENED',
      assetId: 'asset-payroll-file',
      targetNodeId: 'finance',
    });
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain("Relocate the session to 'finance' first");
  });

  it('triggers high alert when decoy file is opened on valid node', () => {
    // Traverse Gateway -> Web -> Finance
    let session = createInitialSession();
    session = appendSimulationEvent(session, {
      type: 'LATERAL_MOVE_ATTEMPT',
      targetNodeId: 'web',
    }).updatedSession;
    const attempt = appendSimulationEvent(session, {
      type: 'LATERAL_MOVE_ATTEMPT',
      targetNodeId: 'finance',
    });
    expect(attempt.outcome).toBe('attempted');
    expect(attempt.updatedSession.currentNodeId).toBe('web');
    session = appendSimulationEvent(attempt.updatedSession, {
      type: 'LATERAL_MOVE_ATTEMPT',
      targetNodeId: 'finance',
    }).updatedSession;
    expect(session.currentNodeId).toBe('finance');

    // Open payroll file
    const fileResult = appendSimulationEvent(session, {
      type: 'SENSITIVE_FILE_OPENED',
      targetNodeId: 'finance',
      assetId: 'asset-payroll-file',
    });
    expect(fileResult.success).toBe(true);
    session = fileResult.updatedSession;

    const alerts = deriveAlerts(session);
    const fileAlert = alerts.find((a) => a.assetId === 'asset-payroll-file');
    expect(fileAlert).toBeDefined();
    expect(fileAlert?.severity).toBe('high');
    expect(fileAlert?.honeytokenId).toBe('HT-FIN-PAYROLL-9921');

    const statuses = deriveNodeStatuses(session);
    expect(statuses.finance).toBe('triggered');
  });

  it('scores accurately and caps threat score at 100', () => {
    let session = createInitialSession();
    // Move 8 + attempt 6 + move 8 + file 35 + credential 45 = 102, capped at 100.
    session = appendSimulationEvent(session, {
      type: 'LATERAL_MOVE_ATTEMPT',
      targetNodeId: 'web',
    }).updatedSession;
    session = appendSimulationEvent(session, {
      type: 'LATERAL_MOVE_ATTEMPT',
      targetNodeId: 'finance',
    }).updatedSession;
    session = appendSimulationEvent(session, {
      type: 'LATERAL_MOVE_ATTEMPT',
      targetNodeId: 'finance',
    }).updatedSession;
    session = appendSimulationEvent(session, {
      type: 'SENSITIVE_FILE_OPENED',
      targetNodeId: 'finance',
      assetId: 'asset-payroll-file',
    }).updatedSession;
    session = appendSimulationEvent(session, {
      type: 'FAKE_CREDENTIAL_USED',
      targetNodeId: 'finance',
    }).updatedSession;

    const score = deriveThreatScore(session);
    expect(score).toBe(100);

    const report = deriveIncidentReport(session);
    expect(report.threatScore).toBe(100);
    expect(report.alertCounts.critical).toBeGreaterThanOrEqual(1);
    expect(report.triggeredDecoys.length).toBe(1);
    expect(report.attackTrajectory).toEqual(['gateway', 'web', 'finance']);
  });

  it('reconstructs attack path and traversed edge IDs', () => {
    let session = createInitialSession();
    session = appendSimulationEvent(session, {
      type: 'LATERAL_MOVE_ATTEMPT',
      targetNodeId: 'web',
    }).updatedSession;
    const attempted = appendSimulationEvent(session, {
      type: 'LATERAL_MOVE_ATTEMPT',
      targetNodeId: 'finance',
    }).updatedSession;
    expect(deriveAttackPath(attempted).pathNodes).toEqual(['gateway', 'web']);
    expect(deriveAttackPath(attempted).attemptedEdgeIds.has('e-web-fin')).toBe(true);
    session = appendSimulationEvent(attempted, {
      type: 'LATERAL_MOVE_ATTEMPT',
      targetNodeId: 'finance',
    }).updatedSession;

    const path = deriveAttackPath(session);
    expect(path.pathNodes).toEqual(['gateway', 'web', 'finance']);
    expect(path.traversedEdgeIds.has('e-gw-web')).toBe(true);
    expect(path.traversedEdgeIds.has('e-web-fin')).toBe(true);
    expect(path.traversedEdgeIds.has('e-gateway-web')).toBe(false);
    expect(path.traversedEdgeIds.has('e-gateway-finance')).toBe(false);
  });

  it('does not let repeated scans reach a critical score', () => {
    let session = createInitialSession();
    for (let i = 0; i < 25; i += 1) {
      session = appendSimulationEvent(session, {
        type: 'SCAN_HOST',
        targetNodeId: 'gateway',
      }).updatedSession;
    }
    expect(deriveThreatScore(session)).toBe(4);
    expect(deriveThreatScore(session)).toBeLessThan(75);
    const report = deriveIncidentReport(session);
    expect(report.classification).not.toContain('critical');
    expect(report.scoreBreakdown.find((row) => row.eventType === 'SCAN_HOST')?.suppressed).toBe(24);
  });
});
