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
			branches: 40,
			functions: 50,
			lines: 60,
			statements: 60
		}
	},
	moduleFileExtensions: ['ts', 'js', 'json'],
	verbose: true
};
