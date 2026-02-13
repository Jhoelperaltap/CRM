import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // IMPORTANT: Only look for tests in src/ directory
  roots: ['<rootDir>/src'],

  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Test patterns - ONLY match .test. files in src directory (NOT .spec. files)
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.[jt]s?(x)',
    '<rootDir>/src/**/*.test.[jt]s?(x)',
  ],

  // Use regex patterns for cross-platform compatibility (Linux CI)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/e2e/',
    '\\.spec\\.',
  ],

  // Coverage configuration - only collect from src
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/types/**/*',
  ],

  // Explicitly set thresholds to 0 to disable enforcement
  coverageThreshold: {
    global: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
  },

  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
};

export default createJestConfig(config);
