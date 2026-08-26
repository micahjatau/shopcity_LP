module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    '^next/link$': '<rootDir>/tests/mocks/next-link.tsx',
    '^next/image$': '<rootDir>/tests/mocks/next-image.tsx',
    '^next/navigation$': '<rootDir>/tests/mocks/next-navigation.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.spec.tsx'],
};
