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

  // Test patterns - only match files in src directory
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/**/*.test.[jt]s?(x)',
  ],

  // Explicitly exclude e2e directory and other non-test directories
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '<rootDir>/e2e/',
    '\\.spec\\.[jt]s$',
  ],

  // Coverage configuration - NO THRESHOLDS
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/types/**/*',
  ],

  // Disable coverage thresholds
  coverageThreshold: undefined,

  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
};

export default createJestConfig(config);
