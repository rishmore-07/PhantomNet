import { describe, expect, it } from 'vitest';
import { planAdaptiveDeployments } from '../src/domain/adaptive';
import { runGoldenScenario } from '../src/domain/demoScript';
import { sanitizeSession } from '../src/domain/persistence';
import { projectSessionAt, sessionSignature } from '../src/domain/replay';
import {
  deriveAttackPath,
  deriveDecoyDeployments,
  deriveIncidentReport,
  deriveThreatScore,
} from '../src/domain/selectors';
import {
  appendSimulationEvent,
  createInitialSession,
  validateAction,
} from '../src/domain/simulation';
import { IntrusionEvent, SimulationSession } from '../src/domain/types';

function event(partial: Partial<IntrusionEvent> & Pick<IntrusionEvent, 'type'>): IntrusionEvent {
  return {
    id: partial.id || `evt-${partial.type}`,
    sessionId: 'sess-test',
    timestamp: partial.timestamp || '2026-10-25T00:00:00.000Z',
    actor: partial.actor || 'simulated-attacker',
    severity: partial.severity || 'info',
    scoreDelta: partial.scoreDelta ?? 0,
    explanation: partial.explanation || partial.type,
    ...partial,
  };
}

describe('adaptive deception', () => {
  it('rejects a forged decoy deployment action', () => {
    const session = createInitialSession();
    const result = appendSimulationEvent(session, { type: 'DECOY_DEPLOYED', targetNodeId: 'web' });
    expect(result.success).toBe(false);
    expect(result.updatedSession.events).toHaveLength(1);
  });

  it('stages one recon decoy on the second scan and not again', () => {
    let session = createInitialSession();
    session = appendSimulationEvent(session, { type: 'SCAN_HOST', targetNodeId: 'gateway' }).updatedSession;
    expect(session.events.some((item) => item.type === 'DECOY_DEPLOYED')).toBe(false);

    session = appendSimulationEvent(session, { type: 'SCAN_HOST', targetNodeId: 'web' }).updatedSession;
    const deployed = session.events.filter((item) => item.type === 'DECOY_DEPLOYED');
    expect(deployed).toHaveLength(1);
    expect(deployed[0].policyId).toBe('policy-repeated-recon');
    expect(deployed[0].targetNodeId).toBe('web');
    expect(deployed[0].actor).toBe('system');
    expect(deployed[0].scoreDelta).toBe(0);
    expect(deployed[0].deploymentReason).toContain('web');

    session = appendSimulationEvent(session, { type: 'SCAN_HOST', targetNodeId: 'web' }).updatedSession;
    expect(session.events.filter((item) => item.policyId === 'policy-repeated-recon')).toHaveLength(1);
    expect(deriveThreatScore(session)).toBe(15);
  });

  it('does not list an adaptive asset before its deployment event', () => {
    const session = createInitialSession();
    const validation = validateAction(session, {
      type: 'SENSITIVE_FILE_OPENED',
      assetId: 'adaptive-access-review',
      targetNodeId: 'finance',
    });
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('not present');
  });

  it('places a finance credential on the database without moving the session there', () => {
    let session = createInitialSession();
    session = appendSimulationEvent(session, {
      type: 'LATERAL_MOVE_ATTEMPT',
      targetNodeId: 'web',
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

    const credential = session.events.find((item) => item.policyId === 'policy-finance-credential');
    expect(credential?.targetNodeId).toBe('database');
    expect(credential?.deploymentReason).toContain('database');
    expect(session.currentNodeId).toBe('finance');

    const path = deriveAttackPath(session);
    expect(path.pathNodes).toEqual(['gateway', 'web', 'finance']);
    expect(path.visitedNodeIds.has('database')).toBe(false);

    const remote = validateAction(session, {
      type: 'HONEYTOKEN_VIEWED',
      assetId: 'adaptive-ledger-cred',
      targetNodeId: 'database',
    });
    expect(remote.valid).toBe(false);
  });

  it('returns the same deployments for the same event sequence', () => {
    const base: IntrusionEvent[] = [
      event({ id: 'e0', type: 'SESSION_STARTED', targetNodeId: 'gateway' }),
      event({ id: 'e1', type: 'SCAN_HOST', targetNodeId: 'gateway', timestamp: '2026-10-25T00:00:01.000Z' }),
      event({ id: 'e2', type: 'SCAN_HOST', targetNodeId: 'finance', timestamp: '2026-10-25T00:00:02.000Z' }),
    ];
    const first = planAdaptiveDeployments(base);
    const second = planAdaptiveDeployments(base.map((item) => ({ ...item })));
    expect(second).toEqual(first);
    expect(first[0]).toMatchObject({
      policyId: 'policy-repeated-recon',
      nodeId: 'finance',
      assetId: 'adaptive-recon-metrics',
    });
  });

  it('produces identical golden-scenario results across runs', () => {
    const first = sessionSignature(runGoldenScenario());
    const second = sessionSignature(runGoldenScenario());
    expect(second).toEqual(first);

    const policies = first.events.filter((item) => item.type === 'DECOY_DEPLOYED').map((item) => item.policyId);
    expect(policies).toEqual([
      'policy-repeated-recon',
      'policy-restricted-segment',
      'policy-finance-credential',
      'policy-credential-follow',
    ]);
  });
});

describe('replay and reporting', () => {
  it('keeps score, path and decoys aligned with the replay prefix', () => {
    const full = runGoldenScenario();
    const deployIndex = full.events.findIndex((item) => item.policyId === 'policy-finance-credential');
    expect(deployIndex).toBeGreaterThan(0);

    const before = projectSessionAt(full, deployIndex - 1);
    const at = projectSessionAt(full, deployIndex);
    expect(deriveDecoyDeployments(before).some((item) => item.policyId === 'policy-finance-credential')).toBe(false);
    expect(deriveDecoyDeployments(at).some((item) => item.policyId === 'policy-finance-credential')).toBe(true);
    expect(deriveThreatScore(at)).toBe(deriveThreatScore(before));
    expect(deriveAttackPath(at).pathNodes).toEqual(deriveAttackPath(before).pathNodes);

    const live = deriveIncidentReport(full);
    const partial = deriveIncidentReport(at, {
      recordedEventCount: full.events.length,
      viewingIndex: deployIndex,
    });
    expect(partial.threatScore).toBe(deriveThreatScore(at));
    expect(partial.timeline).toHaveLength(at.events.length);
    expect(partial.replayView?.eventsRecorded).toBe(full.events.length);
    expect(live.replayView).toBeNull();
    expect(deriveIncidentReport(full)).toEqual(live);
  });

  it('maps justified techniques and refuses attribution', () => {
    let session = createInitialSession();
    session = appendSimulationEvent(session, {
      type: 'LATERAL_MOVE_ATTEMPT',
      targetNodeId: 'web',
    }).updatedSession;
    const report = deriveIncidentReport(session);
    const lateral = report.mitreMappings.find((item) => item.eventType === 'LATERAL_MOVE_ATTEMPT');
    expect(lateral?.tacticId).toBe('TA0008');
    expect(lateral?.techniqueId).toBe('T1021');
    expect(lateral?.detectionExplanation).toContain('simulation');
    expect(report.unmappedEvents.some((item) => item.eventType === 'SESSION_STARTED')).toBe(true);
    expect(report.scopeNotice).toContain('not attribution');
    expect(JSON.stringify(report)).not.toContain('threatActor');
    expect(JSON.stringify(report)).not.toContain('APT');
  });

  it('migrates a stored session and drops unknown event types', () => {
    const current = createInitialSession();
    const payload = {
      ...current,
      events: [
        ...current.events,
        {
          id: 'evt-bad',
          sessionId: current.id,
          timestamp: current.startedAt,
          type: 'PACKET_CAPTURE',
          actor: 'simulated-attacker',
          severity: 'high',
          scoreDelta: 99,
          explanation: 'should not load',
        },
      ],
    };
    const sanitized = sanitizeSession(payload);
    expect(sanitized?.events.some((item) => item.id === 'evt-bad')).toBe(false);
    expect(sanitized?.currentNodeId).toBe('gateway');
    expect(sanitizeSession({ events: [] })).toBeNull();
  });
});

describe('session signature helper', () => {
  it('ignores generated ids when comparing structure', () => {
    const session: SimulationSession = createInitialSession();
    expect(sessionSignature(session).events[0].type).toBe('SESSION_STARTED');
  });
});
