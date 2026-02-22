/**
 * @description 插件元数据聚合器
 *
 * 将插件中的实体和订阅者元数据聚合到 MikroORM 配置中
 *
 * @module @oksai/database
 */
import 'reflect-metadata';
import type { Type, DynamicModule } from '@nestjs/common';
import type { MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import type { EventSubscriber } from '@mikro-orm/core';
import { PLUGIN_METADATA, type PluginInput } from '@oksai/plugin';

/**
 * @description 插件元数据聚合输入参数
 */
export interface ComposeMikroOrmOptionsFromPluginsInput {
	/**
	 * @description 基础配置（来自 app/database 的默认配置）
	 */
	base?: Partial<MikroOrmModuleOptions>;

	/**
	 * @description 启用的插件列表（Nest Module / DynamicModule）
	 */
	plugins?: PluginInput[];

	/**
	 * @description 是否启用冲突检测（默认 true）
	 */
	detectConflicts?: boolean;
}

/**
 * @description 重复元数据信息
 */
interface DuplicateMeta {
	/**
	 * @description 元数据类型
	 */
	kind: 'entity' | 'subscriber';

	/**
	 * @description 类名
	 */
	className: string;

	/**
	 * @description 首次出现的来源
	 */
	firstSource: string;

	/**
	 * @description 第二次出现的来源
	 */
	secondSource: string;
}

/**
 * @description MikroORM 订阅者类型
 */
type MikroOrmSubscriber = EventSubscriber<unknown> | (new (...args: unknown[]) => EventSubscriber<unknown>);

/**
 * @description 判断是否为 DynamicModule
 * @param v - 输入值
 * @returns 是否为 DynamicModule
 */
function isDynamicModule(v: unknown): v is DynamicModule {
	return !!v && typeof v === 'object' && 'module' in (v as Record<string, unknown>);
}

/**
 * @description 将插件元数据（entities/subscribers）聚合到 MikroORM options 中
 *
 * 设计目的：
 * - 对齐 qauzy-core 的"启动前聚合实体/订阅者"机制
 * - 保持本项目单栈：只为 MikroORM 生成 options
 *
 * @param input - 输入参数
 * @returns 聚合后的 MikroORM 配置
 *
 * @example
 * ```typescript
 * const options = composeMikroOrmOptionsFromPlugins({
 *   base: {
 *     entities: [User],
 *     subscribers: [UserSubscriber],
 *   },
 *   plugins: [PluginA, PluginB],
 *   detectConflicts: true,
 * });
 * ```
 */
export function composeMikroOrmOptionsFromPlugins(
	input: ComposeMikroOrmOptionsFromPluginsInput
): Partial<MikroOrmModuleOptions> {
	const base = input.base ?? {};
	const plugins = input.plugins ?? [];
	const detectConflicts = input.detectConflicts ?? true;

	const baseEntities = normalizeTypeArray(base.entities as Array<Type<unknown>> | undefined);
	const baseSubscribers = normalizeArray<MikroOrmSubscriber>(
		base.subscribers as Array<MikroOrmSubscriber> | undefined
	);

	const { entities: pluginEntities, duplicates: entityDuplicates } = collectPluginTypeMetadata(
		plugins,
		PLUGIN_METADATA.ENTITIES,
		'entity'
	);
	const { entities: pluginSubscribers, duplicates: subscriberDuplicates } =
		collectPluginTypeMetadata<MikroOrmSubscriber>(plugins, PLUGIN_METADATA.SUBSCRIBERS, 'subscriber');

	if (detectConflicts) {
		const duplicates = [...entityDuplicates, ...subscriberDuplicates];
		if (duplicates.length > 0) {
			throw new Error(formatPluginDuplicateError(duplicates));
		}
	}

	return {
		...base,
		entities: [...baseEntities, ...pluginEntities],
		subscribers: [...baseSubscribers, ...pluginSubscribers]
	};
}

/**
 * @description 规范化类型数组
 * @param value - 输入值
 * @returns 类型数组
 */
function normalizeTypeArray(value: Array<Type<unknown>> | undefined): Array<Type<unknown>> {
	return Array.isArray(value) ? value : [];
}

/**
 * @description 规范化数组
 * @param value - 输入值
 * @returns 数组
 */
function normalizeArray<T>(value: Array<T> | undefined): Array<T> {
	return Array.isArray(value) ? value : [];
}

/**
 * @description 解析延迟加载数组
 * @param value - 输入值（可能是函数或数组）
 * @returns 数组
 */
function resolveLazyArray<T>(value: unknown): Array<T> {
	if (typeof value === 'function') {
		return resolveLazyArray<T>((value as () => unknown)());
	}
	return Array.isArray(value) ? (value as Array<T>) : [];
}

/**
 * @description 收集插件类型元数据
 * @param plugins - 插件列表
 * @param metadataKey - 元数据键
 * @param kind - 元数据类型
 * @returns 实体列表和重复项列表
 */
function collectPluginTypeMetadata<T = Type<unknown>>(
	plugins: PluginInput[],
	metadataKey: string | symbol,
	kind: DuplicateMeta['kind']
): { entities: Array<T>; duplicates: DuplicateMeta[] } {
	const out: Array<T> = [];
	const duplicates: DuplicateMeta[] = [];
	const seen = new Map<string, string>(); // className -> source

	for (const plugin of plugins) {
		const moduleType = isDynamicModule(plugin) ? plugin.module : plugin;
		const source = moduleType?.name ?? '(anonymous plugin module)';
		const items = resolveLazyArray<T>(Reflect.getMetadata(metadataKey, moduleType));
		for (const item of items) {
			const className = (item as { name?: string })?.name ?? '(anonymous class)';
			const prev = seen.get(className);
			if (prev) {
				duplicates.push({
					kind,
					className,
					firstSource: prev,
					secondSource: source
				});
				continue;
			}
			seen.set(className, source);
			out.push(item);
		}
	}

	return { entities: out, duplicates };
}

/**
 * @description 格式化插件重复错误消息
 * @param duplicates - 重复项列表
 * @returns 格式化的错误消息
 */
function formatPluginDuplicateError(duplicates: DuplicateMeta[]): string {
	const lines = duplicates.map((d) => {
		const kind = d.kind === 'entity' ? '实体' : '订阅者';
		return `- ${kind}冲突：${d.className}（${d.firstSource} vs ${d.secondSource}）`;
	});
	return ['插件元数据冲突（请重命名或调整装配列表）：', ...lines].join('\n');
}
