/** @type {import('jest').Config} */
module.exports = {
    // Use a basic preset that avoids expo's new runtime
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
    // Only run pure TypeScript unit tests (no React Native components)
    // For component tests, use Detox or Maestro for E2E
};
