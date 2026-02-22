/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: './src',
	testMatch: ['**/*.spec.ts'],
	collectCoverageFrom: ['lib/**/*.ts', '!lib/**/*.spec.ts', '!lib/index.ts'],
	coverageDirectory: '../coverage',
	coverageThreshold: {
		global: {
			branches: 60,
			functions: 80,
			lines: 80,
			statements: 80
		}
	},
	moduleFileExtensions: ['ts', 'js', 'json'],
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1'
	},
	transform: {
		'^.+\\.ts$': ['ts-jest', { useESM: true }]
	},
	extensionsToTreatAsEsm: ['.ts'],
	verbose: true
};
