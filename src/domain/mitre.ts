import { EventType, IntrusionEvent, MitreMappingRecord, UnmappedEventRecord } from './types';

export const SIMULATION_SCOPE_NOTE =
  'Every event in this report was produced by the in-browser PhantomNet simulation. ATT&CK labels describe those simulated actions. They are not attribution, not a claim that a live intrusion occurred, and not a verdict from a network sensor.';

interface TechniqueMap {
  tacticId: string;
  tacticName: string;
  techniqueId: string;
  techniqueName: string;
  detectionExplanation: string;
}

/**
 * Mappings are included only where the simulated action clearly corresponds
 * to a published technique. Session setup and defender deployments are omitted.
 */
const TECHNIQUE_BY_EVENT: Partial<Record<EventType, TechniqueMap>> = {
  SCAN_HOST: {
    tacticId: 'TA0043',
    tacticName: 'Reconnaissance',
    techniqueId: 'T1046',
    techniqueName: 'Network Service Discovery',
    detectionExplanation:
      'The simulation recorded a port-and-service scan. T1046 is the closest published technique for that action.',
  },
  BROWSE_DIRECTORY: {
    tacticId: 'TA0007',
    tacticName: 'Discovery',
    techniqueId: 'T1083',
    techniqueName: 'File and Directory Discovery',
    detectionExplanation:
      'The simulation recorded a directory listing on the current host. T1083 matches that discovery action.',
  },
  LOGIN_FAILED: {
    tacticId: 'TA0006',
    tacticName: 'Credential Access',
    techniqueId: 'T1110.001',
    techniqueName: 'Brute Force: Password Guessing',
    detectionExplanation:
      'The simulation recorded a rejected login. T1110.001 is used because the action is a guessed authentication attempt, not a successful compromise.',
  },
  SENSITIVE_FILE_OPENED: {
    tacticId: 'TA0009',
    tacticName: 'Collection',
    techniqueId: 'T1005',
    techniqueName: 'Data from Local System',
    detectionExplanation:
      'The simulation recorded an open of a local decoy file. T1005 matches collection from the host. The file is synthetic.',
  },
  HONEYTOKEN_VIEWED: {
    tacticId: 'TA0006',
    tacticName: 'Credential Access',
    techniqueId: 'T1552.001',
    techniqueName: 'Unsecured Credentials: Credentials In Files',
    detectionExplanation:
      'The simulation recorded a view of a credential file. T1552.001 matches reading credentials from a file. The secret is synthetic.',
  },
  FAKE_CREDENTIAL_USED: {
    tacticId: 'TA0001',
    tacticName: 'Initial Access',
    techniqueId: 'T1078',
    techniqueName: 'Valid Accounts',
    detectionExplanation:
      'The simulation recorded an authentication attempt that presented a synthetic credential. T1078 is the closest technique. No real account was used.',
  },
  LATERAL_MOVE_ATTEMPT: {
    tacticId: 'TA0008',
    tacticName: 'Lateral Movement',
    techniqueId: 'T1021',
    techniqueName: 'Remote Services',
    detectionExplanation:
      'The simulation recorded a lateral action toward an adjacent host. T1021 is used at technique level only. A blocked or attempted outcome is not a successful session move, and no remote-service sub-technique is asserted.',
  },
};

const UNMAPPED_REASON: Partial<Record<EventType, string>> = {
  SESSION_STARTED:
    'Session start is bookkeeping for the simulation. It is not mapped to an ATT&CK technique.',
  DECOY_DEPLOYED:
    'Decoy deployment is a defender action inside the simulation. It is not an attacker technique.',
};

export function mitreForEvent(event: IntrusionEvent): MitreMappingRecord | null {
  const technique = TECHNIQUE_BY_EVENT[event.type];
  if (!technique) return null;
  return {
    eventId: event.id,
    eventType: event.type,
    timestamp: event.timestamp,
    tacticId: technique.tacticId,
    tacticName: technique.tacticName,
    techniqueId: technique.techniqueId,
    techniqueName: technique.techniqueName,
    evidence: event.evidence || event.explanation,
    detectionExplanation: technique.detectionExplanation,
  };
}

export function unmappedReason(event: IntrusionEvent): UnmappedEventRecord {
  return {
    eventId: event.id,
    eventType: event.type,
    reason:
      UNMAPPED_REASON[event.type] ||
      'This simulated event does not have a technique mapping that can be justified from the recorded action.',
  };
}
