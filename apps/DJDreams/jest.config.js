const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
}

// Override next/jest's default transformIgnorePatterns to handle pnpm + ESM packages
module.exports = async () => {
  const jestConfig = await createJestConfig(customJestConfig)()
  jestConfig.transformIgnorePatterns = [
    '/node_modules/(?!.pnpm/(bad-words|badwords-list)@)/',
    '^.+\\.module\\.(css|sass|scss)$',
  ]
  return jestConfig
}
