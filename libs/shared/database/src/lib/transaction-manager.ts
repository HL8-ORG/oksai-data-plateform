/**
 * 事务接口
 */
export interface ITransaction {
	/**
	 * 检查事务是否活跃
	 */
	isActive(): boolean;

	/**
	 * 提交事务
	 */
	commit(): Promise<void>;

	/**
	 * 回滚事务
	 */
	rollback(): Promise<void>;
}

/**
 * 事务管理器接口
 */
import { IConnectionPool } from './connection-pool';

export interface ITransactionManager {
	/**
	 * 开始事务
	 */
	beginTransaction(): Promise<ITransaction>;
}

/**
 * 事务
 *
 * 表示一个数据库事务。
 *
 * @example
 * ```typescript
 * const tx = await txManager.beginTransaction();
 * try {
 *   // 执行操作...
 *   await tx.commit();
 * } catch (error) {
 *   await tx.rollback();
 * }
 * ```
 */
export class Transaction implements ITransaction {
	/**
	 * 是否活跃
	 * @private
	 */
	private active: boolean = true;

	/**
	 * 检查事务是否活跃
	 *
	 * @returns 如果活跃返回 true
	 */
	public isActive(): boolean {
		return this.active;
	}

	/**
	 * 提交事务
	 */
	public async commit(): Promise<void> {
		if (!this.active) {
			throw new Error('事务已结束');
		}
		this.active = false;
	}

	/**
	 * 回滚事务
	 */
	public async rollback(): Promise<void> {
		if (!this.active) {
			throw new Error('事务已结束');
		}
		this.active = false;
	}
}

/**
 * 事务管理器
 *
 * 管理数据库事务的生命周期。
 *
 * @example
 * ```typescript
 * const txManager = TransactionManager.create(connectionPool);
 * const tx = await txManager.beginTransaction();
 * ```
 */
export class TransactionManager implements ITransactionManager {
	/**
	 * 连接池
	 * @private
	 */
	private readonly pool: IConnectionPool;

	private constructor(pool: IConnectionPool) {
		this.pool = pool;
	}

	/**
	 * 创建事务管理器
	 *
	 * @param pool - 连接池
	 * @returns 事务管理器实例
	 */
	public static create(pool: IConnectionPool): TransactionManager {
		return new TransactionManager(pool);
	}

	/**
	 * 开始事务
	 *
	 * @returns 新的事务实例
	 */
	public async beginTransaction(): Promise<ITransaction> {
		if (!this.pool.isConnected()) {
			throw new Error('连接池未连接');
		}
		return new Transaction();
	}
}
