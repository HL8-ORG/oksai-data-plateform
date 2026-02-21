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
			branches: 79,
			functions: 85,
			lines: 85,
			statements: 85
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
