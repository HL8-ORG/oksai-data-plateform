/**
 * Database 模块单元测试
 *
 * 测试数据库访问功能
 */
import { DatabaseConfig, ConnectionPool, IConnectionPool, TransactionManager, RepositoryBase, Transaction } from '../index';

describe('Database', () => {
	describe('DatabaseConfig', () => {
		describe('create', () => {
			it('应该创建数据库配置', () => {
				const config = DatabaseConfig.create({
					host: 'localhost',
					port: 5432,
					database: 'test_db',
					username: 'test_user',
					password: 'test_pass',
					maxConnections: 10
				});

				expect(config.host).toBe('localhost');
				expect(config.port).toBe(5432);
				expect(config.database).toBe('test_db');
				expect(config.username).toBe('test_user');
				expect(config.password).toBe('test_pass');
				expect(config.maxConnections).toBe(10);
			});

			it('应该使用默认端口', () => {
				const config = DatabaseConfig.create({
					host: 'localhost',
					database: 'test_db',
					username: 'test_user',
					password: 'test_pass'
				});

				expect(config.port).toBe(5432);
			});

			it('应该使用默认最大连接数', () => {
				const config = DatabaseConfig.create({
					host: 'localhost',
					database: 'test_db',
					username: 'test_user',
					password: 'test_pass'
				});

				expect(config.maxConnections).toBe(20);
			});
		});

		describe('toConnectionString', () => {
			it('应该生成连接字符串', () => {
				const config = DatabaseConfig.create({
					host: 'localhost',
					port: 5432,
					database: 'test_db',
					username: 'test_user',
					password: 'test_pass'
				});

				const connStr = config.toConnectionString();

				expect(connStr).toBe('postgresql://test_user:test_pass@localhost:5432/test_db');
			});
		});
	});

	describe('ConnectionPool', () => {
		function createTestPool(): ConnectionPool {
			const config = DatabaseConfig.create({
				host: 'localhost',
				database: 'test_db',
				username: 'test_user',
				password: 'test_pass'
			});
			return ConnectionPool.create(config);
		}

		describe('create', () => {
			it('应该创建连接池', () => {
				const config = DatabaseConfig.create({
					host: 'localhost',
					database: 'test_db',
					username: 'test_user',
					password: 'test_pass'
				});

				const pool = ConnectionPool.create(config);

				expect(pool).toBeDefined();
				expect(pool.config).toBe(config);
			});
		});

		describe('isConnected', () => {
			it('初始状态应该未连接', () => {
				const pool = createTestPool();
				expect(pool.isConnected()).toBe(false);
			});

			it('连接后应该返回 true', async () => {
				const pool = createTestPool();
				await pool.connect();
				expect(pool.isConnected()).toBe(true);
			});

			it('断开后应该返回 false', async () => {
				const pool = createTestPool();
				await pool.connect();
				await pool.disconnect();
				expect(pool.isConnected()).toBe(false);
			});
		});

		describe('connect', () => {
			it('应该建立连接', async () => {
				const pool = createTestPool();

				await pool.connect();

				expect(pool.isConnected()).toBe(true);
			});
		});

		describe('disconnect', () => {
			it('应该断开连接', async () => {
				const pool = createTestPool();
				await pool.connect();

				await pool.disconnect();

				expect(pool.isConnected()).toBe(false);
			});
		});

		describe('acquire', () => {
			it('未连接时应该抛出错误', async () => {
				const pool = createTestPool();

				await expect(pool.acquire()).rejects.toThrow('连接池未连接');
			});

			it('已连接时应该返回连接对象', async () => {
				const pool = createTestPool();
				await pool.connect();

				const conn = await pool.acquire();

				expect(conn).toBeDefined();
				expect(conn).toHaveProperty('id');
			});
		});

		describe('release', () => {
			it('应该成功释放连接', async () => {
				const pool = createTestPool();
				await pool.connect();
				const conn = await pool.acquire();

				await expect(pool.release(conn)).resolves.not.toThrow();
			});
		});
	});

	describe('Transaction', () => {
		describe('isActive', () => {
			it('新事务应该处于活跃状态', () => {
				const tx = new Transaction();
				expect(tx.isActive()).toBe(true);
			});

			it('提交后应该不活跃', async () => {
				const tx = new Transaction();
				await tx.commit();
				expect(tx.isActive()).toBe(false);
			});

			it('回滚后应该不活跃', async () => {
				const tx = new Transaction();
				await tx.rollback();
				expect(tx.isActive()).toBe(false);
			});
		});

		describe('commit', () => {
			it('应该成功提交事务', async () => {
				const tx = new Transaction();

				await tx.commit();

				expect(tx.isActive()).toBe(false);
			});

			it('已结束的事务提交时应该抛出错误', async () => {
				const tx = new Transaction();
				await tx.commit();

				await expect(tx.commit()).rejects.toThrow('事务已结束');
			});
		});

		describe('rollback', () => {
			it('应该成功回滚事务', async () => {
				const tx = new Transaction();

				await tx.rollback();

				expect(tx.isActive()).toBe(false);
			});

			it('已结束的事务回滚时应该抛出错误', async () => {
				const tx = new Transaction();
				await tx.rollback();

				await expect(tx.rollback()).rejects.toThrow('事务已结束');
			});

			it('已提交的事务回滚时应该抛出错误', async () => {
				const tx = new Transaction();
				await tx.commit();

				await expect(tx.rollback()).rejects.toThrow('事务已结束');
			});
		});
	});

	describe('TransactionManager', () => {
		function createMockPool(connected: boolean = true): IConnectionPool {
			return {
				config: {} as any,
				isConnected: () => connected,
				acquire: async () => ({}) as any,
				release: async () => {},
				connect: async () => {},
				disconnect: async () => {}
			};
		}

		describe('create', () => {
			it('应该创建事务管理器', () => {
				const mockPool = createMockPool();

				const txManager = TransactionManager.create(mockPool);

				expect(txManager).toBeDefined();
			});
		});

		describe('beginTransaction', () => {
			it('应该开始事务', async () => {
				const mockPool = createMockPool(true);
				const txManager = TransactionManager.create(mockPool);

				const tx = await txManager.beginTransaction();

				expect(tx).toBeDefined();
				expect(tx.isActive()).toBe(true);
			});

			it('连接池未连接时应该抛出错误', async () => {
				const mockPool = createMockPool(false);
				const txManager = TransactionManager.create(mockPool);

				await expect(txManager.beginTransaction()).rejects.toThrow('连接池未连接');
			});
		});
	});

	describe('RepositoryBase', () => {
		interface TestEntity {
			id: string;
			name: string;
		}

		class TestRepository extends RepositoryBase<TestEntity> {
			async findById(id: string): Promise<TestEntity | null> {
				return { id, name: 'test' };
			}

			async save(entity: TestEntity): Promise<void> {}
		}

		it('应该定义仓储基类', () => {
			const repo = new TestRepository();
			expect(repo).toBeDefined();
		});

		it('findById 应该由子类实现', async () => {
			const repo = new TestRepository();
			const entity = await repo.findById('123');
			expect(entity).toEqual({ id: '123', name: 'test' });
		});

		it('save 应该由子类实现', async () => {
			const repo = new TestRepository();
			await expect(repo.save({ id: '1', name: 'test' })).resolves.not.toThrow();
		});

		it('delete 默认应该抛出未实现错误', async () => {
			const repo = new TestRepository();
			await expect(repo.delete('123')).rejects.toThrow('delete 方法未实现');
		});

		it('findAll 默认应该抛出未实现错误', async () => {
			const repo = new TestRepository();
			await expect(repo.findAll()).rejects.toThrow('findAll 方法未实现');
		});

		it('count 默认应该抛出未实现错误', async () => {
			const repo = new TestRepository();
			await expect(repo.count()).rejects.toThrow('count 方法未实现');
		});
	});
});
