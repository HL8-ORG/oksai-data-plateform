/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: './src',
	testMatch: ['**/*.spec.ts'],
	collectCoverageFrom: ['lib/**/*.ts', '!lib/**/*.spec.ts', '!lib/index.ts'],
	coverageDirectory: '../coverage',
	coverageThreshold: {
		global: {
			branches: 90,
			functions: 90,
			lines: 90,
			statements: 90
		}
	},
	moduleFileExtensions: ['ts', 'js', 'json'],
	verbose: true
};
