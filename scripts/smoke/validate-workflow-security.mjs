import { readFile } from 'node:fs/promises';

const stagingWorkflow = new URL(
  '../../.github/workflows/staging-smoke.yml',
  import.meta.url,
);

export function validateStagingWorkflowSecurity(source) {
  const required = [
    'github.event.workflow_run.repository.full_name == github.repository',
    "github.event.workflow_run.head_branch == 'staging'",
    "github.event.workflow_run.event == 'push'",
    "github.event.workflow_run.conclusion == 'success'",
    'persist-credentials: false',
    'permissions:\n  contents: read',
    'test "${CANDIDATE_SHA}" = "$(git rev-parse HEAD)"',
    'npx prisma migrate deploy',
  ];
  for (const fragment of required) {
    if (!source.includes(fragment)) {
      throw new Error(`staging workflow missing security control: ${fragment}`);
    }
  }
  if (
    source.includes('migrate resolve') ||
    source.includes('UPDATE "Device"')
  ) {
    throw new Error(
      'staging workflow contains direct migration/device remediation',
    );
  }
  return true;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  validateStagingWorkflowSecurity(await readFile(stagingWorkflow, 'utf8'));
  console.log('staging workflow security controls valid');
}
