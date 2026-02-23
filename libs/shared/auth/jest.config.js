/**
 * Jest 配置 - @oksai/auth
 *
 * @type {import('ts-jest').JestConfigWithTsJest}
 */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: './src',
	testMatch: ['**/*.spec.ts'],
	collectCoverageFrom: ['lib/**/*.ts', '!lib/**/*.spec.ts', '!lib/index.ts'],
	coverageDirectory: '../coverage',
	coverageThreshold: {
		global: {
			branches: 15,
			functions: 13,
			lines: 19,
			statements: 20
		}
	},
	moduleFileExtensions: ['ts', 'js', 'json'],
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
		'^better-auth$': '<rootDir>/__mocks__/better-auth/index.js',
		'^better-auth/plugins$': '<rootDir>/__mocks__/better-auth/plugins.js',
		'^better-auth/adapters$': '<rootDir>/__mocks__/better-auth/adapters.js',
		'^@oksai/better-auth-mikro-orm$': '<rootDir>/__mocks__/@oksai/better-auth-mikro-orm.js'
	},
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.spec.json'
			}
		]
	},
	verbose: true
};
