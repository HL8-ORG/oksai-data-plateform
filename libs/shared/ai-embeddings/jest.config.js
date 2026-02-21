/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: 'src',
	moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
	testRegex: '\\.spec\\.ts$',
	collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!**/index.ts'],
	coverageDirectory: '../coverage',
	coverageThreshold: {
		global: {
			branches: 75,
			functions: 85,
			lines: 75,
			statements: 75
		}
	},
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.json'
			}
		]
	}
};
