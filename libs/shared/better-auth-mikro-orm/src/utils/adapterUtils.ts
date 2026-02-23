import type { EntityMetadata, EntityProperty, MikroORM } from '@mikro-orm/core';
import { ReferenceKind, serialize } from '@mikro-orm/core';
import type { Where } from 'better-auth';
import { dset } from 'dset';

import { createAdapterError } from './createAdapterError.js';

/**
 * 适配器工具集接口
 */
export interface AdapterUtils {
	/**
	 * 使用配置的命名策略规范化给定的模型名称
	 *
	 * @param name - 实体名称
	 */
	normalizeEntityName(name: string): string;

	/**
	 * 从 MetadataStorage 返回给定 entityName 的元数据
	 *
	 * @param entityName - 要获取元数据的实体名称
	 * @throws BetterAuthError 当未找到元数据时
	 */
	getEntityMetadata(name: string): EntityMetadata;

	/**
	 * 返回字段引用的路径
	 *
	 * @param metadata - 实体元数据
	 * @param fieldName - 字段名称
	 * @param throwOnShadowProps - 是否对 Shadow Props 抛出错误
	 * @throws BetterAuthError 当字段不存在时
	 * @throws BetterAuthError 如果在 fieldName 关系中发现复杂主键
	 */
	getFieldPath(metadata: EntityMetadata, fieldName: string, throwOnShadowProps?: boolean): string[];

	/**
	 * 为 Mikro ORM 规范化 Better Auth 数据
	 *
	 * @param metadata - 实体元数据
	 * @param input - 要规范化的数据
	 */
	normalizeInput(metadata: EntityMetadata, input: Record<string, any>): Record<string, any>;

	/**
	 * 为 Better Auth 规范化 Mikro ORM 输出
	 *
	 * @param metadata - 实体元数据
	 * @param output - Mikro ORM 查询结果
	 * @param select - 要返回的字段列表
	 */
	normalizeOutput(metadata: EntityMetadata, output: Record<string, any>, select?: string[]): Record<string, any>;

	/**
	 * 为 Mikro ORM 转换给定的 Where 子句列表
	 *
	 * @param metadata - 实体元数据
	 * @param where - 要规范化的 where 子句列表
	 */
	normalizeWhereClauses(metadata: EntityMetadata, where?: Where[]): Record<string, any>;
}

/**
 * 自身引用类型
 */
const ownReferences = [ReferenceKind.SCALAR, ReferenceKind.ONE_TO_MANY, ReferenceKind.EMBEDDED];

/**
 * 创建适配器工具集
 *
 * @param orm - Mikro ORM 实例
 */
export function createAdapterUtils(orm: MikroORM): AdapterUtils {
	const naming = orm.config.getNamingStrategy();
	const metadata = orm.getMetadata();

	/**
	 * Better Auth 实体名称到表名的映射
	 * Better Auth 使用 "User", "Session" 等名称，我们需要映射到实际表名
	 */
	const betterAuthTableMap: Record<string, string> = {
		user: 'user',
		session: 'session',
		account: 'account',
		verification: 'verification',
		organization: 'organization',
		member: 'member',
		invitation: 'invitation'
	};

	/**
	 * 规范化实体名称
	 */
	const normalizeEntityName: AdapterUtils['normalizeEntityName'] = (name) => {
		const lowerName = name.toLowerCase();
		if (betterAuthTableMap[lowerName]) {
			return betterAuthTableMap[lowerName];
		}
		return naming.getEntityName(naming.classToTableName(name));
	};

	/**
	 * 获取实体元数据
	 */
	const getEntityMetadata: AdapterUtils['getEntityMetadata'] = (entityName: string) => {
		const normalizedName = normalizeEntityName(entityName);

		// 首先尝试直接查找（通过类名）
		if (metadata.has(entityName)) {
			return metadata.get(entityName);
		}

		// 尝试通过规范化名称查找
		if (metadata.has(normalizedName)) {
			return metadata.get(normalizedName);
		}

		// 如果找不到，尝试在所有实体中查找匹配表名的实体
		const allMetadata = metadata.getAll();
		for (const meta of Object.values(allMetadata)) {
			if (meta.tableName === normalizedName) {
				return meta;
			}
		}

		// 仍然找不到，打印可用的实体名称用于调试
		const availableEntities = Object.keys(allMetadata).filter((k) => !k.startsWith('Base'));
		createAdapterError(
			`无法找到 "${entityName}" 实体的元数据。规范化名称: "${normalizedName}"。可用的实体: ${availableEntities.join(', ')}`
		);
	};

	/**
	 * 获取属性元数据
	 */
	function getPropertyMetadata(metadata: EntityMetadata, fieldName: string): EntityProperty {
		const prop = metadata.props.find((prop) => {
			if (ownReferences.includes(prop.kind) && prop.name === fieldName) {
				return true;
			}

			if (
				prop.kind === ReferenceKind.MANY_TO_ONE &&
				(prop.name === fieldName || prop.fieldNames.includes(naming.propertyToColumnName(fieldName)))
			) {
				return true;
			}

			return false;
		});

		if (!prop) {
			createAdapterError(`无法在实体 "${metadata.className}" 上找到属性 "${fieldName}"。`);
		}

		return prop;
	}

	/**
	 * 获取引用列名
	 */
	function getReferencedColumnName(entityName: string, prop: EntityProperty) {
		if (ownReferences.includes(prop.kind)) {
			return prop.name;
		}

		if (prop.kind === ReferenceKind.MANY_TO_ONE) {
			return naming.columnNameToProperty(naming.joinColumnName(prop.name));
		}

		createAdapterError(`不支持引用类型 ${prop.kind}。在 "${entityName}" 实体的 "${prop.name}" 字段中定义。`);
	}

	/**
	 * 获取引用属性名（驼峰命名）
	 */
	const getReferencedPropertyName = (metadata: EntityMetadata, prop: EntityProperty) =>
		getReferencedColumnName(metadata.className, prop);

	/**
	 * 获取字段路径
	 */
	const getFieldPath: AdapterUtils['getFieldPath'] = (metadata, fieldName, throwOnShadowProps = false) => {
		const prop = getPropertyMetadata(metadata, fieldName);

		if (prop.persist === false && throwOnShadowProps) {
			createAdapterError(`无法将 "${fieldName}" 序列化为路径，因为它无法持久化到 "${metadata.tableName}" 表中。`);
		}

		if (prop.kind === ReferenceKind.SCALAR || prop.kind === ReferenceKind.EMBEDDED) {
			return [prop.name];
		}

		if (prop.kind === ReferenceKind.MANY_TO_ONE) {
			if (prop.referencedPKs.length > 1) {
				createAdapterError(`"${fieldName}" 字段引用到具有复杂主键的表 "${prop.name}"，不支持此类型`);
			}

			return [prop.name, naming.referenceColumnName()];
		}

		createAdapterError(`无法将 "${fieldName}" 字段名规范化为 "${metadata.className}" 实体的路径。`);
	};

	/**
	 * 规范化属性原始输入值
	 */
	const normalizePropertyValue = (property: EntityProperty, value: unknown): unknown => {
		if (
			!property.targetMeta ||
			property.kind === ReferenceKind.SCALAR ||
			property.kind === ReferenceKind.EMBEDDED
		) {
			return value;
		}

		return orm.em.getReference(property.targetMeta.class, value);
	};

	/**
	 * 规范化输入
	 */
	const normalizeInput: AdapterUtils['normalizeInput'] = (metadata, input) => {
		const fields: Record<string, any> = {};
		Object.entries(input).forEach(([key, value]) => {
			const property = getPropertyMetadata(metadata, key);
			const normalizedValue = normalizePropertyValue(property, value);

			dset(fields, [property.name], normalizedValue);
		});

		return fields;
	};

	/**
	 * 规范化输出
	 */
	const normalizeOutput: AdapterUtils['normalizeOutput'] = (metadata, output, select) => {
		output = serialize(output);

		const result: Record<string, any> = {};

		// 如果有 select，只返回选中的字段
		if (select && select.length > 0) {
			for (const field of select) {
				const prop = metadata.props.find((p) => p.name === field);
				if (prop && output[field] !== undefined) {
					result[field] = output[field];
				}
			}
			return result;
		}

		// 返回所有字段
		Object.entries(output)
			.map(([key, value]) => ({
				path: getReferencedPropertyName(metadata, getPropertyMetadata(metadata, key)),
				value
			}))
			.forEach(({ path, value }) => dset(result, path, value));

		return result;
	};

	/**
	 * 创建 where 子句
	 */
	function createWhereClause(
		path: Array<string | number>,
		value: unknown,
		op?: string,
		target: Record<string, any> = {}
	): Record<string, any> {
		dset(target, op == null || op === 'eq' ? path : path.concat(op), value);

		return target;
	}

	/**
	 * 创建 $in where 子句
	 */
	function createWhereInClause(
		fieldName: string,
		path: Array<string | number>,
		value: unknown,
		target?: Record<string, any>
	): Record<string, any> {
		if (!Array.isArray(value)) {
			createAdapterError(`使用 $in 操作符时，"${fieldName}" 字段的值必须是数组。`);
		}

		return createWhereClause(path, value, '$in', target);
	}

	/**
	 * 规范化 where 子句
	 */
	const normalizeWhereClauses: AdapterUtils['normalizeWhereClauses'] = (metadata, where) => {
		if (!where) {
			return {};
		}

		if (where.length === 1) {
			const [w] = where;

			if (!w) {
				return {};
			}

			const path = getFieldPath(metadata, w.field, true);

			switch (w.operator) {
				case 'in':
					return createWhereInClause(w.field, path, w.value);
				case 'contains':
					return createWhereClause(path, `%${w.value}%`, '$like');
				case 'starts_with':
					return createWhereClause(path, `${w.value}%`, '$like');
				case 'ends_with':
					return createWhereClause(path, `%${w.value}`, '$like');
				case 'gt':
				case 'gte':
				case 'lt':
				case 'lte':
				case 'ne':
					return createWhereClause(path, w.value, `$${w.operator}`);
				default:
					return createWhereClause(path, w.value);
			}
		}

		const result: Record<string, any> = {};

		where
			.filter(({ connector }) => !connector || connector === 'AND')
			.forEach(({ field, operator, value }, index) => {
				const path = ['$and', index].concat(getFieldPath(metadata, field, true));

				if (operator === 'in') {
					return createWhereInClause(field, path, value, result);
				}

				return createWhereClause(path, value, 'eq', result);
			});

		where
			.filter(({ connector }) => connector === 'OR')
			.forEach(({ field, value }, index) => {
				const path = ['$and', index].concat(getFieldPath(metadata, field, true));

				return createWhereClause(path, value, 'eq', result);
			});

		return result;
	};

	return {
		getEntityMetadata,
		normalizeEntityName,
		getFieldPath,
		normalizeInput,
		normalizeOutput,
		normalizeWhereClauses
	};
}
