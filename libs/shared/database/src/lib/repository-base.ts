/**
 * 仓储基类
 *
 * 提供仓储的通用接口和基础实现。
 *
 * @template T - 实体类型
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * class UserRepository extends RepositoryBase<User> {
 *   async findById(id: string): Promise<User | null> {
 *     // 实现查找逻辑
 *   }
 *
 *   async save(user: User): Promise<void> {
 *     // 实现保存逻辑
 *   }
 * }
 * ```
 */
export abstract class RepositoryBase<T> {
	/**
	 * 根据 ID 查找实体
	 *
	 * @param id - 实体 ID
	 * @returns 实体实例，如果不存在返回 null
	 */
	abstract findById(id: string): Promise<T | null>;

	/**
	 * 保存实体
	 *
	 * @param entity - 要保存的实体
	 */
	abstract save(entity: T): Promise<void>;

	/**
	 * 根据 ID 删除实体
	 *
	 * @param id - 实体 ID
	 */
	async delete(id: string): Promise<void> {
		throw new Error('delete 方法未实现');
	}

	/**
	 * 查找所有实体
	 *
	 * @returns 所有实体列表
	 */
	async findAll(): Promise<T[]> {
		throw new Error('findAll 方法未实现');
	}

	/**
	 * 统计实体数量
	 *
	 * @returns 实体数量
	 */
	async count(): Promise<number> {
		throw new Error('count 方法未实现');
	}
}
