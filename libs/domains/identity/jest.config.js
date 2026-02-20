/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: './src',
	testMatch: ['**/*.spec.ts'],
	collectCoverageFrom: [
		'domain/**/*.ts',
		'application/**/*.ts',
		'!**/*.spec.ts',
		'!**/index.ts'
	],
	coverageDirectory: '../coverage',
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 85,
			lines: 85,
			statements: 85
		}
	},
	moduleFileExtensions: ['ts', 'js', 'json'],
	verbose: true
};
