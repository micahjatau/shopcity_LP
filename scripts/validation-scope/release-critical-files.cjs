const RELEASE_CRITICAL_FILE_PATTERNS = [
  /^src\/.*\.ts$/,
  /^test\/.*\.ts$/,
  /^prisma\/schema\.prisma$/,
  /^prisma\/migrations\/.*\.sql$/,
  /^\.github\/workflows\/.*\.ya?ml$/,
  /^scripts\/.*$/,
  /^docs\/api\/.*$/,
  /^docs\/database\/.*$/,
  /^docs\/runbooks\/.*$/,
  /^docs\/release-evidence\/.*$/,
  /^openspec\/changes\/(?!archive\/).*$/,
  /^package\.json$/,
  /^tsconfig\.json$/,
  /^tsconfig\.client\.json$/,
  /^nest-cli\.json$/,
  /^eslint\.config\.(js|cjs)$/,
  /^dependency-cruiser\.config\.cjs$/,
];

function isReleaseCriticalFile(file) {
  return RELEASE_CRITICAL_FILE_PATTERNS.some((pattern) => pattern.test(file));
}

module.exports = {
  RELEASE_CRITICAL_FILE_PATTERNS,
  isReleaseCriticalFile,
};
