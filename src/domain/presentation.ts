import { NetworkNodeDef } from './types';

export type Viewer = 'defender' | 'attacker';

export function presentHost(node: NetworkNodeDef, perspective: Viewer) {
  const concealed = perspective === 'attacker';
  return {
    label: concealed && node.coverLabel ? node.coverLabel : node.label,
    role: concealed && node.coverRole ? node.coverRole : node.role,
    description: concealed && node.coverDescription ? node.coverDescription : node.description,
    os: concealed && node.coverOs ? node.coverOs : node.os,
    services: concealed
      ? node.coverServices ??
        node.services.filter((service) => !/decoy|honey|fake|canary|trap/i.test(service))
      : node.services,
  };
}

export function presentCopy(text: string, perspective: Viewer): string {
  if (perspective !== 'attacker') return text;
  return text.split('decoy-vault').join('Cold Archive');
}

export function presentPreview(preview: string, perspective: Viewer): string {
  if (perspective === 'defender') return preview;
  return preview
    .split('\n')
    .filter((line) => !/(honeytoken|canary|decoy|tripwire|phantomnet|beacon)/i.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function presentMetadata(
  metadata: Record<string, string> | undefined,
  perspective: Viewer
): Array<[string, string]> {
  if (!metadata) return [];
  return Object.entries(metadata).filter(([key, value]) => {
    if (perspective === 'defender') return key !== 'origin' && key !== 'policyId';
    return !/(honeytoken|canary|decoy|tripwire|beacon|policy|origin)/i.test(`${key} ${value}`);
  });
}
