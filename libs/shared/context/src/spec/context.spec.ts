/**
 * Context 模块单元测试
 *
 * 测试多租户上下文管理
 */
import { TenantContext, TenantContextService, AsyncLocalStorageProvider } from '../index';

describe('Context', () => {
	describe('TenantContext', () => {
		describe('create', () => {
			it('应该创建租户上下文', () => {
				// Arrange & Act
				const context = TenantContext.create({
					tenantId: 'tenant-123',
					userId: 'user-456'
				});

				// Assert
				expect(context.tenantId).toBe('tenant-123');
				expect(context.userId).toBe('user-456');
			});

			it('userId 应该是可选的', () => {
				// Arrange & Act
				const context = TenantContext.create({
					tenantId: 'tenant-123'
				});

				// Assert
				expect(context.tenantId).toBe('tenant-123');
				expect(context.userId).toBeUndefined();
			});

			it('应该生成默认的 correlationId', () => {
				// Arrange & Act
				const context = TenantContext.create({
					tenantId: 'tenant-123'
				});

				// Assert
				expect(context.correlationId).toBeDefined();
				expect(typeof context.correlationId).toBe('string');
			});

			it('应该支持自定义 correlationId', () => {
				// Arrange & Act
				const context = TenantContext.create({
					tenantId: 'tenant-123',
					correlationId: 'corr-789'
				});

				// Assert
				expect(context.correlationId).toBe('corr-789');
			});
		});

		describe('withUserId', () => {
			it('应该创建带有新 userId 的上下文副本', () => {
				// Arrange
				const context = TenantContext.create({
					tenantId: 'tenant-123'
				});

				// Act
				const newContext = context.withUserId('user-456');

				// Assert
				expect(newContext.tenantId).toBe('tenant-123');
				expect(newContext.userId).toBe('user-456');
				expect(context.userId).toBeUndefined(); // 原上下文不变
			});
		});
	});

	describe('AsyncLocalStorageProvider', () => {
		let provider: AsyncLocalStorageProvider;

		beforeEach(() => {
			provider = new AsyncLocalStorageProvider();
		});

		describe('run', () => {
			it('应该在上下文中运行函数', () => {
				// Arrange
				const context = TenantContext.create({
					tenantId: 'tenant-123',
					userId: 'user-456'
				});

				// Act
				const result = provider.run(context, () => {
					return provider.get();
				});

				// Assert
				expect(result?.tenantId).toBe('tenant-123');
				expect(result?.userId).toBe('user-456');
			});

			it('应该支持嵌套上下文', () => {
				// Arrange
				const context1 = TenantContext.create({ tenantId: 'tenant-1' });
				const context2 = TenantContext.create({ tenantId: 'tenant-2' });

				// Act
				provider.run(context1, () => {
					expect(provider.get()?.tenantId).toBe('tenant-1');

					provider.run(context2, () => {
						expect(provider.get()?.tenantId).toBe('tenant-2');
					});

					expect(provider.get()?.tenantId).toBe('tenant-1');
				});
			});

			it('应该支持异步函数', async () => {
				// Arrange
				const context = TenantContext.create({
					tenantId: 'tenant-123'
				});

				// Act
				const result = await provider.run(context, async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					return provider.get();
				});

				// Assert
				expect(result?.tenantId).toBe('tenant-123');
			});
		});

		describe('get', () => {
			it('没有上下文时应该返回 undefined', () => {
				// Act
				const result = provider.get();

				// Assert
				expect(result).toBeUndefined();
			});
		});

		describe('getOrThrow', () => {
			it('有上下文时应该返回上下文', () => {
				// Arrange
				const context = TenantContext.create({ tenantId: 'tenant-123' });

				// Act
				const result = provider.run(context, () => {
					return provider.getOrThrow();
				});

				// Assert
				expect(result.tenantId).toBe('tenant-123');
			});

			it('没有上下文时应该抛出异常', () => {
				// Act & Assert
				expect(() => provider.getOrThrow()).toThrow('租户上下文未设置');
			});
		});
	});

	describe('TenantContextService', () => {
		let service: TenantContextService;
		let provider: AsyncLocalStorageProvider;

		beforeEach(() => {
			provider = new AsyncLocalStorageProvider();
			service = new TenantContextService(provider);
		});

		describe('run', () => {
			it('应该在上下文中运行函数', () => {
				// Arrange
				const context = TenantContext.create({
					tenantId: 'tenant-123',
					userId: 'user-456'
				});

				// Act
				const result = service.run(context, () => {
					return {
						tenantId: service.tenantId,
						userId: service.userId
					};
				});

				// Assert
				expect(result.tenantId).toBe('tenant-123');
				expect(result.userId).toBe('user-456');
			});
		});

		describe('tenantId', () => {
			it('应该返回当前租户 ID', () => {
				// Arrange
				const context = TenantContext.create({
					tenantId: 'tenant-123'
				});

				// Act
				const tenantId = service.run(context, () => service.tenantId);

				// Assert
				expect(tenantId).toBe('tenant-123');
			});

			it('没有上下文时应该返回空字符串', () => {
				// Act
				const tenantId = service.tenantId;

				// Assert
				expect(tenantId).toBe('');
			});
		});

		describe('userId', () => {
			it('应该返回当前用户 ID', () => {
				// Arrange
				const context = TenantContext.create({
					tenantId: 'tenant-123',
					userId: 'user-456'
				});

				// Act
				const userId = service.run(context, () => service.userId);

				// Assert
				expect(userId).toBe('user-456');
			});

			it('没有用户时应该返回 undefined', () => {
				// Arrange
				const context = TenantContext.create({
					tenantId: 'tenant-123'
				});

				// Act
				const userId = service.run(context, () => service.userId);

				// Assert
				expect(userId).toBeUndefined();
			});
		});

		describe('correlationId', () => {
			it('应该返回关联 ID', () => {
				// Arrange
				const context = TenantContext.create({
					tenantId: 'tenant-123',
					correlationId: 'corr-789'
				});

				// Act
				const correlationId = service.run(context, () => service.correlationId);

				// Assert
				expect(correlationId).toBe('corr-789');
			});

			it('没有上下文时应该返回空字符串', () => {
				// Act
				const correlationId = service.correlationId;

				// Assert
				expect(correlationId).toBe('');
			});
		});

		describe('getContext', () => {
			it('应该返回完整上下文', () => {
				// Arrange
				const context = TenantContext.create({
					tenantId: 'tenant-123',
					userId: 'user-456',
					correlationId: 'corr-789'
				});

				// Act
				const result = service.run(context, () => service.getContext());

				// Assert
				expect(result).toEqual({
					tenantId: 'tenant-123',
					userId: 'user-456',
					correlationId: 'corr-789'
				});
			});
		});

		describe('getContextOrThrow', () => {
			it('有上下文时应该返回上下文', () => {
				// Arrange
				const context = TenantContext.create({
					tenantId: 'tenant-123'
				});

				// Act
				const result = service.run(context, () => service.getContextOrThrow());

				// Assert
				expect(result.tenantId).toBe('tenant-123');
			});

			it('没有上下文时应该抛出异常', () => {
				// Act & Assert
				expect(() => service.getContextOrThrow()).toThrow('租户上下文未设置');
			});
		});
	});
});
