/**
 * CQRS 模块单元测试
 *
 * 测试命令查询分离功能
 */
import { Command, CommandBus, Query, QueryBus, ICommand, ICommandHandler, IQuery, IQueryHandler } from '../index';

describe('CQRS', () => {
	describe('Command', () => {
		describe('create', () => {
			it('应该创建命令', () => {
				// Arrange & Act
				const command = Command.create({
					type: 'CreateTask',
					payload: { title: '测试任务', budget: 1000 }
				});

				// Assert
				expect(command.type).toBe('CreateTask');
				expect(command.payload).toEqual({ title: '测试任务', budget: 1000 });
				expect(command.timestamp).toBeDefined();
			});

			it('应该自动生成时间戳', () => {
				// Arrange
				const before = Date.now();

				// Act
				const command = Command.create({ type: 'Test', payload: {} });

				// Assert
				const after = Date.now();
				expect(command.timestamp).toBeGreaterThanOrEqual(before);
				expect(command.timestamp).toBeLessThanOrEqual(after);
			});

			it('应该支持元数据', () => {
				// Arrange & Act
				const command = Command.create({
					type: 'CreateTask',
					payload: {},
					metadata: {
						tenantId: 'tenant-123',
						userId: 'user-456',
						correlationId: 'corr-789'
					}
				});

				// Assert
				expect(command.metadata?.tenantId).toBe('tenant-123');
				expect(command.metadata?.userId).toBe('user-456');
				expect(command.metadata?.correlationId).toBe('corr-789');
			});
		});
	});

	describe('CommandHandler', () => {
		it('应该定义处理器接口', () => {
			// Arrange
			class TestCommandHandler implements ICommandHandler<ICommand> {
				async execute(command: ICommand): Promise<void> {
					// 处理逻辑
				}
			}

			// Act & Assert
			const handler = new TestCommandHandler();
			expect(handler.execute).toBeDefined();
		});
	});

	describe('CommandBus', () => {
		let commandBus: CommandBus;

		beforeEach(() => {
			commandBus = new CommandBus();
		});

		describe('register', () => {
			it('应该注册命令处理器', () => {
				// Arrange
				const handler: ICommandHandler<ICommand> = {
					execute: async () => {}
				};

				// Act
				commandBus.register('CreateTask', handler);

				// Assert
				expect(commandBus.hasHandler('CreateTask')).toBe(true);
			});

			it('重复注册应该抛出异常', () => {
				// Arrange
				const handler: ICommandHandler<ICommand> = {
					execute: async () => {}
				};
				commandBus.register('CreateTask', handler);

				// Act & Assert
				expect(() => {
					commandBus.register('CreateTask', handler);
				}).toThrow('命令处理器已注册: CreateTask');
			});
		});

		describe('execute', () => {
			it('应该执行命令', async () => {
				// Arrange
				let executed = false;
				const handler: ICommandHandler<ICommand> = {
					execute: async () => {
						executed = true;
					}
				};
				commandBus.register('CreateTask', handler);

				const command = Command.create({
					type: 'CreateTask',
					payload: { title: '测试' }
				});

				// Act
				await commandBus.execute(command);

				// Assert
				expect(executed).toBe(true);
			});

			it('未注册处理器时应该抛出异常', async () => {
				// Arrange
				const command = Command.create({
					type: 'UnknownCommand',
					payload: {}
				});

				// Act & Assert
				await expect(commandBus.execute(command)).rejects.toThrow('未找到命令处理器: UnknownCommand');
			});

			it('应该传递命令负载给处理器', async () => {
				// Arrange
				let receivedPayload: any = null;
				const handler: ICommandHandler<ICommand> = {
					execute: async (command) => {
						receivedPayload = command.payload;
					}
				};
				commandBus.register('CreateTask', handler);

				const command = Command.create({
					type: 'CreateTask',
					payload: { title: '测试任务', budget: 5000 }
				});

				// Act
				await commandBus.execute(command);

				// Assert
				expect(receivedPayload).toEqual({ title: '测试任务', budget: 5000 });
			});
		});

		describe('unregister', () => {
			it('应该注销命令处理器', () => {
				// Arrange
				const handler: ICommandHandler<ICommand> = {
					execute: async () => {}
				};
				commandBus.register('CreateTask', handler);

				// Act
				commandBus.unregister('CreateTask');

				// Assert
				expect(commandBus.hasHandler('CreateTask')).toBe(false);
			});
		});
	});

	describe('Query', () => {
		describe('create', () => {
			it('应该创建查询', () => {
				// Arrange & Act
				const query = Query.create({
					type: 'GetTask',
					params: { taskId: 'task-123' }
				});

				// Assert
				expect(query.type).toBe('GetTask');
				expect(query.params).toEqual({ taskId: 'task-123' });
				expect(query.timestamp).toBeDefined();
			});
		});
	});

	describe('QueryHandler', () => {
		it('应该定义处理器接口', () => {
			// Arrange
			class TestQueryHandler implements IQueryHandler<IQuery<string>, string> {
				async execute(query: IQuery<string>): Promise<string> {
					return 'result';
				}
			}

			// Act & Assert
			const handler = new TestQueryHandler();
			expect(handler.execute).toBeDefined();
		});
	});

	describe('QueryBus', () => {
		let queryBus: QueryBus;

		beforeEach(() => {
			queryBus = new QueryBus();
		});

		describe('register', () => {
			it('应该注册查询处理器', () => {
				// Arrange
				const handler: IQueryHandler<IQuery<any>, any> = {
					execute: async () => ({})
				};

				// Act
				queryBus.register('GetTask', handler);

				// Assert
				expect(queryBus.hasHandler('GetTask')).toBe(true);
			});
		});

		describe('execute', () => {
			it('应该执行查询并返回结果', async () => {
				// Arrange
				const expectedResult = { id: 'task-123', title: '测试任务' };
				const handler: IQueryHandler<IQuery<any>, any> = {
					execute: async () => expectedResult
				};
				queryBus.register('GetTask', handler);

				const query = Query.create({
					type: 'GetTask',
					params: { taskId: 'task-123' }
				});

				// Act
				const result = await queryBus.execute(query);

				// Assert
				expect(result).toEqual(expectedResult);
			});

			it('未注册处理器时应该抛出异常', async () => {
				// Arrange
				const query = Query.create({
					type: 'UnknownQuery',
					params: {}
				});

				// Act & Assert
				await expect(queryBus.execute(query)).rejects.toThrow('未找到查询处理器: UnknownQuery');
			});
		});

		describe('unregister', () => {
			it('应该注销查询处理器', () => {
				// Arrange
				const handler: IQueryHandler<IQuery<unknown>, unknown> = {
					execute: async () => ({})
				};
				queryBus.register('GetTask', handler);
				expect(queryBus.hasHandler('GetTask')).toBe(true);

				// Act
				queryBus.unregister('GetTask');

				// Assert
				expect(queryBus.hasHandler('GetTask')).toBe(false);
			});
		});
	});
});
