const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { isReleaseCriticalFile } = require('./release-critical-files.cjs');
const { COVERAGE_RULES } = require('./coverage-rules.cjs');

function listGitFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function resolveCoverage(files = listGitFiles()) {
  const criticalFiles = files.filter(isReleaseCriticalFile);
  const coverageByFile = new Map();

  for (const file of criticalFiles) {
    const matchedRules = COVERAGE_RULES.filter((rule) =>
      rule.pattern.test(file),
    );
    coverageByFile.set(
      file,
      matchedRules.flatMap((rule) => rule.validators),
    );
  }

  const uncovered = criticalFiles.filter((file) => {
    const validators = coverageByFile.get(file) ?? [];
    return validators.length === 0;
  });

  return { criticalFiles, coverageByFile, uncovered };
}

function loadPackageScripts() {
  return (
    JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'))
      .scripts ?? {}
  );
}

function collectWorkflowJobs() {
  const workflowFiles = listGitFiles().filter((file) =>
    /^\.github\/workflows\/.*\.ya?ml$/.test(file),
  );

  return workflowFiles.flatMap((workflowFile) => {
    const workflow = yaml.load(
      readFileSync(path.join(process.cwd(), workflowFile), 'utf8'),
    );
    const jobs = workflow?.jobs ?? {};

    return Object.entries(jobs).map(([jobId, job]) => ({
      workflowFile,
      jobId,
      continueOnError: Boolean(job?.['continue-on-error']),
      steps: Array.isArray(job?.steps)
        ? job.steps
            .map((step) => step?.run)
            .filter((run) => typeof run === 'string')
        : [],
    }));
  });
}

function validatePackageScripts(scripts = loadPackageScripts()) {
  const referencedScripts = new Set(
    COVERAGE_RULES.flatMap((rule) => rule.validators),
  );
  const missing = [...referencedScripts].filter((script) => !scripts[script]);

  return { missing };
}

function validateWorkflowCommands() {
  const jobs = collectWorkflowJobs();
  const requiredCommands = [
    ...new Set(COVERAGE_RULES.flatMap((rule) => rule.validators)),
  ];
  const missing = requiredCommands.filter(
    (command) =>
      !jobs.some((job) =>
        job.steps.some((step) => step.includes(`npm run ${command}`)),
      ),
  );
  const optionalized = jobs.filter(
    (job) =>
      job.continueOnError &&
      job.steps.some((step) =>
        requiredCommands.some((command) => step.includes(`npm run ${command}`)),
      ),
  );

  return { missing, optionalized, jobs };
}

function formatReport({ uncovered, coverageByFile }) {
  if (uncovered.length === 0) {
    const lines = ['All release-critical files are covered.'];
    for (const [file, validators] of coverageByFile.entries()) {
      lines.push(`${file} -> ${validators.join(', ')}`);
    }
    return lines.join('\n');
  }

  const files = uncovered.map((file) => `- ${file}`);
  const validators = [
    ...new Set(uncovered.flatMap((file) => coverageByFile.get(file) ?? [])),
  ];

  return [
    'Release-critical files outside validation:',
    ...files,
    'Required validators:',
    ...validators.map((validator) => `- ${validator}`),
  ].join('\n');
}

function main() {
  const coverage = resolveCoverage();
  const packageCheck = validatePackageScripts();
  const workflowCheck = validateWorkflowCommands();
  const issues = [];

  if (coverage.uncovered.length > 0) {
    issues.push('coverage');
  }
  if (packageCheck.missing.length > 0) {
    issues.push('package-scripts');
  }
  if (workflowCheck.missing.length > 0) {
    issues.push('workflow-commands');
  }
  if (workflowCheck.optionalized.length > 0) {
    issues.push('optionalized-commands');
  }

  if (issues.length > 0) {
    console.error(formatReport(coverage));
    if (packageCheck.missing.length > 0) {
      console.error('Missing package scripts:');
      for (const script of packageCheck.missing) {
        console.error(`- ${script}`);
      }
    }
    if (workflowCheck.missing.length > 0) {
      console.error('Missing CI commands:');
      for (const command of workflowCheck.missing) {
        console.error(`- ${command}`);
      }
    }
    if (workflowCheck.optionalized.length > 0) {
      console.error('Required workflow steps use continue-on-error:');
      for (const job of workflowCheck.optionalized) {
        console.error(`- ${job.workflowFile} :: ${job.jobId}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log(formatReport(coverage));
}

module.exports = {
  collectWorkflowJobs,
  formatReport,
  listGitFiles,
  main,
  resolveCoverage,
  validatePackageScripts,
  validateWorkflowCommands,
};
