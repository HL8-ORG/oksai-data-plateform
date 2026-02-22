/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: './src',
	testMatch: ['**/*.spec.ts'],
	collectCoverageFrom: ['lib/**/*.ts', '!lib/**/*.spec.ts', '!lib/index.ts'],
	coverageDirectory: '../coverage',
	// 迁移阶段：Pipeline 和 NestJS 集成需要较多测试
	coverageThreshold: {
		global: {
			branches: 50,
			functions: 50,
			lines: 50,
			statements: 50
		}
	},
	moduleFileExtensions: ['ts', 'js', 'json'],
	verbose: true
};
