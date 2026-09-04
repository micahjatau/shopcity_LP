import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const stagingWorkflow = new URL(
  '../../.github/workflows/staging-smoke.yml',
  import.meta.url,
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(`staging workflow missing security control: ${message}`);
  }
}

function expressionContains(expression, fragment) {
  return typeof expression === 'string' && expression.includes(fragment);
}

export function validateStagingWorkflowSecurity(source) {
  const workflow = parse(source);
  const smoke = workflow?.jobs?.smoke;
  assert(smoke && typeof smoke === 'object', 'jobs.smoke');
  assert(
    expressionContains(
      smoke.if,
      'github.event.workflow_run.repository.full_name == github.repository',
    ),
    'trusted workflow_run repository',
  );
  assert(
    expressionContains(
      smoke.if,
      "github.event.workflow_run.head_branch == 'staging'",
    ),
    'trusted staging branch',
  );
  assert(
    expressionContains(smoke.if, "github.event.workflow_run.event == 'push'"),
    'trusted push event',
  );
  assert(
    expressionContains(
      smoke.if,
      "github.event.workflow_run.conclusion == 'success'",
    ),
    'successful upstream workflow',
  );
  assert(
    workflow.permissions?.contents === 'read',
    'permissions.contents: read',
  );

  const steps = Array.isArray(smoke.steps) ? smoke.steps : [];
  const checkout = steps.find((step) => step?.uses === 'actions/checkout@v4');
  assert(checkout, 'pinned checkout action');
  assert(
    checkout.with?.['persist-credentials'] === false,
    'persist-credentials: false',
  );
  assert(typeof checkout.with?.ref === 'string', 'exact checkout ref');

  const shaStep = steps.find((step) => step?.name === 'Verify candidate SHA');
  assert(
    shaStep?.run?.trim() ===
      'test "${CANDIDATE_SHA}" = "$(git rev-parse HEAD)"',
    'exact candidate SHA verification',
  );

  const migrationStep = steps.find(
    (step) => step?.name === 'Apply staging database migrations',
  );
  assert(migrationStep, 'staging migration step');
  assert(
    typeof migrationStep.run === 'string' &&
      migrationStep.run.includes('npx prisma migrate deploy'),
    'strict Prisma migration deployment',
  );
  assert(
    !steps.some(
      (step) =>
        typeof step?.run === 'string' &&
        (step.run.includes('migrate resolve') ||
          step.run.includes('UPDATE "Device"')),
    ),
    'no direct migration/device remediation',
  );

  return true;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  validateStagingWorkflowSecurity(await readFile(stagingWorkflow, 'utf8'));
  console.log('staging workflow security controls valid');
}
