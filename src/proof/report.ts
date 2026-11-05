import { exitCodeFor, type Result } from './assess.ts';

const LABEL = { contained: 'Contained', breached: 'BREACHED', inconclusive: 'Inconclusive' } as const;

export function renderReport(results: Result[], meta: { owners: string; startedAt: string; finishedAt: string }): string {
  const code = exitCodeFor(results);
  const headline = code === 0
    ? 'All nine attacks were contained, and the clean payment went through.'
    : code === 1
      ? 'At least one attack succeeded or a control failed.'
      : 'The run could not reach a verdict. This is not a pass.';
  const rows = results.map((r) => `| ${r.id} | ${r.title} | ${LABEL[r.outcome]} | ${r.detail.replaceAll('|', '/')} |`);
  return [
    '# Invoice Airlock proof',
    '',
    headline,
    '',
    `Owners: ${meta.owners}. Started ${meta.startedAt}, finished ${meta.finishedAt}.`,
    '',
    '| Check | What was tried | Result | Evidence |',
    '|---|---|---|---|',
    ...rows,
    '',
    `Exit code: ${code}`,
    '',
  ].join('\n');
}

export const REPORT_JSON_PREFIX = 'AIRLOCK-REPORT-JSON ';
export const REPORT_MD_BEGIN = 'AIRLOCK-REPORT-MD-BEGIN';
export const REPORT_MD_END = 'AIRLOCK-REPORT-MD-END';

export function reportOutput(results: Result[], meta: { owners: string; startedAt: string; finishedAt: string }): string {
  return [
    REPORT_MD_BEGIN,
    renderReport(results, meta),
    REPORT_MD_END,
    `${REPORT_JSON_PREFIX}${JSON.stringify({ ...meta, exitCode: exitCodeFor(results), results })}`,
  ].join('\n');
}
