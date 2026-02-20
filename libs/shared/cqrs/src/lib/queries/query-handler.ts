/**
 * 查询处理器接口
 *
 * @template T - 查询类型
 * @template R - 返回类型
 */
import { IQuery } from './query';

export interface IQueryHandler<T extends IQuery = IQuery, R = unknown> {
	/**
	 * 执行查询
	 *
	 * @param query - 查询实例
	 * @returns 查询结果
	 */
	execute(query: T): Promise<R>;
}
