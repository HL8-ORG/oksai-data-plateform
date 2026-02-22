import type { FindOptions, MikroORM } from '@mikro-orm/core';
import { createAdapter } from 'better-auth/adapters';
import { dset } from 'dset';

import { createAdapterUtils } from './utils/adapterUtils.js';

/**
 * Mikro ORM 适配器配置
 */
export interface MikroOrmAdapterConfig {
	/**
	 * 启用调试日志
	 *
	 * @default false
	 */
	debugLogs?: boolean;

	/**
	 * 指示目标数据库是否支持 JSON
	 *
	 * 默认启用，因为 Mikro ORM 通过 JsonType 支持 JSON 序列化/反序列化。
	 * 参见文档：https://mikro-orm.io/docs/json-properties
	 *
	 * 如果禁用，Better Auth 将为您处理这些转换。
	 *
	 * @default true
	 */
	supportsJSON?: boolean;
}

/**
 * 创建 Better Auth 的 Mikro ORM 适配器
 *
 * 当前限制：
 *   - 不支持 m:m 和 1:m 以及嵌入式引用
 *   - 不支持复杂主键
 *   - 不支持 schema 生成
 *
 * @param orm - 从 `MikroORM.init` 或 `MikroORM.initSync` 方法返回的 Mikro ORM 实例
 * @param config - Mikro ORM 适配器的额外配置
 *
 * @example
 * ```typescript
 * import { mikroOrmAdapter } from '@oksai/better-auth-mikro-orm';
 * import { betterAuth } from 'better-auth';
 * import { orm } from './orm.js';
 *
 * export const auth = betterAuth({
 *   database: mikroOrmAdapter(orm),
 *   advanced: {
 *     database: {
 *       generateId: false
 *     }
 *   }
 * });
 * ```
 */
export const mikroOrmAdapter = (orm: MikroORM, { debugLogs, supportsJSON = true }: MikroOrmAdapterConfig = {}) =>
	createAdapter({
		config: {
			debugLogs: debugLogs
				? {
						isRunningAdapterTests: true
					}
				: undefined,
			supportsJSON,
			adapterId: 'mikro-orm-adapter',
			adapterName: 'Mikro ORM Adapter'
		},

		adapter() {
			const { getEntityMetadata, getFieldPath, normalizeInput, normalizeOutput, normalizeWhereClauses } =
				createAdapterUtils(orm);

			return {
				/**
				 * 创建实体
				 */
				async create({ model, data, select }) {
					const metadata = getEntityMetadata(model);
					const input = normalizeInput(metadata, data);

					const entity = orm.em.create(metadata.class, input);

					await orm.em.persistAndFlush(entity);

					return normalizeOutput(metadata, entity, select) as any;
				},

				/**
				 * 计数
				 */
				async count({ model, where }): Promise<number> {
					const metadata = getEntityMetadata(model);

					return orm.em.count(metadata.class, normalizeWhereClauses(metadata, where));
				},

				/**
				 * 查找单个实体
				 */
				async findOne({ model, where, select }) {
					const metadata = getEntityMetadata(model);

					const entity = await orm.em.findOne(metadata.class, normalizeWhereClauses(metadata, where));

					if (!entity) {
						return null;
					}

					return normalizeOutput(metadata, entity, select) as any;
				},

				/**
				 * 查找多个实体
				 */
				async findMany({ model, where, limit, offset, sortBy }) {
					const metadata = getEntityMetadata(model);

					const options: FindOptions<any> = {
						limit,
						offset
					};

					if (sortBy) {
						const path = getFieldPath(metadata, sortBy.field);
						dset(options, ['orderBy', ...path], sortBy.direction);
					}

					const rows = await orm.em.find(metadata.class, normalizeWhereClauses(metadata, where), options);

					return rows.map((row) => normalizeOutput(metadata, row)) as any;
				},

				/**
				 * 更新单个实体
				 */
				async update({ model, where, update }) {
					const metadata = getEntityMetadata(model);

					const entity = await orm.em.findOne(metadata.class, normalizeWhereClauses(metadata, where));

					if (!entity) {
						return null;
					}

					orm.em.assign(entity, normalizeInput(metadata, update as any));

					await orm.em.flush();

					return normalizeOutput(metadata, entity) as any;
				},

				/**
				 * 批量更新
				 */
				async updateMany({ model, where, update }) {
					const metadata = getEntityMetadata(model);

					return orm.em.nativeUpdate(
						metadata.class,
						normalizeWhereClauses(metadata, where),
						normalizeInput(metadata, update as any)
					);
				},

				/**
				 * 删除单个实体
				 */
				async delete({ model, where }) {
					const metadata = getEntityMetadata(model);

					const entity = await orm.em.findOne(metadata.class, normalizeWhereClauses(metadata, where), {
						fields: ['id']
					});

					if (entity) {
						await orm.em.removeAndFlush(entity);
					}
				},

				/**
				 * 批量删除
				 */
				async deleteMany({ model, where }) {
					const metadata = getEntityMetadata(model);

					return orm.em.nativeDelete(metadata.class, normalizeWhereClauses(metadata, where));
				}
			};
		}
	});
