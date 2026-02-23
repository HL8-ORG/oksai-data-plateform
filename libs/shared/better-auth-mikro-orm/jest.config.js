/**
 * Jest 配置 - @oksai/better-auth-mikro-orm
 *
 * @type {import('ts-jest').JestConfigWithTsJest}
 */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: './src',
	testMatch: ['**/*.spec.ts'],
	collectCoverageFrom: [
		'utils/**/*.ts',
		'!utils/**/*.spec.ts'
	],
	coverageDirectory: '../coverage',
	coverageThreshold: {
		global: {
			branches: 30,
			functions: 35,
			lines: 40,
			statements: 40
		}
	},
	moduleFileExtensions: ['ts', 'js', 'json', 'mjs'],
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
		'^(\\.{1,2}/.*)$': '$1'
	},
	transform: {
		'^.+\\.ts$': ['ts-jest', {
			tsconfig: 'tsconfig.spec.json'
		}]
	},
	transformIgnorePatterns: [
		'node_modules/(?!(better-auth)/)'
	],
	verbose: true
};
