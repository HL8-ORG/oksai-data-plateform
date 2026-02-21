import {
	setupMessagingPostgresModule,
	SetupMessagingPostgresModuleOptions
} from '../../lib/nest/setup-messaging-postgres-module';

describe('setupMessagingPostgresModule', () => {
	describe('模块配置', () => {
		it('应返回动态模块定义', () => {
			const result = setupMessagingPostgresModule();

			expect(result).toBeDefined();
			expect(result.module).toBeDefined();
			expect(result.global).toBe(false);
		});

		it('应设置 isGlobal 为 true（当 options.isGlobal 为 true）', () => {
			const options: SetupMessagingPostgresModuleOptions = { isGlobal: true };
			const result = setupMessagingPostgresModule(options);

			expect(result.global).toBe(true);
		});

		it('应设置 isGlobal 为 false（默认）', () => {
			const result = setupMessagingPostgresModule();

			expect(result.global).toBe(false);
		});

		it('应配置正确的 providers', () => {
			const result = setupMessagingPostgresModule();

			expect(result.providers).toBeDefined();
			expect(result.providers).toHaveLength(2);
		});

		it('应配置正确的 exports', () => {
			const result = setupMessagingPostgresModule();

			expect(result.exports).toBeDefined();
			expect(result.exports).toHaveLength(2);
		});

		it('应配置 MikroOrmModule.forFeature', () => {
			const result = setupMessagingPostgresModule();

			expect(result.imports).toBeDefined();
			expect(result.imports).toHaveLength(1);
		});
	});

	describe('空选项处理', () => {
		it('应处理 undefined 选项', () => {
			const result = setupMessagingPostgresModule(undefined);

			expect(result).toBeDefined();
			expect(result.global).toBe(false);
		});

		it('应处理空对象选项', () => {
			const result = setupMessagingPostgresModule({});

			expect(result).toBeDefined();
			expect(result.global).toBe(false);
		});
	});
});
