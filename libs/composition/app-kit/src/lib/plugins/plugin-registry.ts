/**
 * 插件输入定义
 *
 * 描述一个可装配的插件模块
 */
export interface PluginInput {
	/**
	 * 插件名称
	 */
	name: string;

	/**
	 * 插件模块（NestJS DynamicModule 或 Type）
	 */
	module: unknown;
}

/**
 * 注册插件选项
 */
export interface RegisterPluginsOptions {
	/**
	 * 是否允许覆盖同名插件（默认 false）
	 */
	allowOverride?: boolean;
}

/**
 * 从环境变量解析插件选项
 */
export interface ResolvePluginsFromEnvOptions {
	/**
	 * 环境变量名（默认 PLUGINS_ENABLED）
	 */
	envName?: string;

	/**
	 * 分隔符（默认逗号）
	 */
	separator?: string;

	/**
	 * 遇到未知插件名是否抛错（默认 true，fail-fast）
	 */
	strict?: boolean;
}

/**
 * 插件注册表
 *
 * 设计目标：
 * - app-kit 不直接依赖任何具体插件实现（避免变成业务 core）
 * - 由 app 在启动时注册"可用插件清单"（name -> PluginInput）
 * - 再由 app-kit 根据环境变量 `PLUGINS_ENABLED` 解析出需要装配的插件列表
 */
const registry = new Map<string, PluginInput>();

/**
 * 注册可用插件
 *
 * @param plugins - 插件映射（name -> PluginInput）
 * @param options - 注册选项
 * @throws Error 当重复注册且不允许覆盖时抛出
 *
 * @example
 * ```typescript
 * registerPlugins({
 *   'demo-plugin': { name: 'demo-plugin', module: DemoPluginModule }
 * });
 * ```
 */
export function registerPlugins(
	plugins: Record<string, PluginInput>,
	options: RegisterPluginsOptions = {},
): void {
	const allowOverride = options.allowOverride ?? false;

	for (const [name, plugin] of Object.entries(plugins)) {
		if (!name || name.trim().length === 0) continue;

		if (registry.has(name) && !allowOverride) {
			throw new Error(`重复注册插件：${name}。如需覆盖请设置 allowOverride=true。`);
		}

		registry.set(name, plugin);
	}
}

/**
 * 获取已注册插件名称列表（用于诊断）
 *
 * @returns 排序后的插件名称数组
 */
export function getRegisteredPluginNames(): string[] {
	return Array.from(registry.keys()).sort();
}

/**
 * 清空注册表（测试/重置用）
 */
export function clearPluginRegistry(): void {
	registry.clear();
}

/**
 * 从环境变量解析需要启用的插件模块
 *
 * @param options - 解析选项
 * @returns 启用的插件列表
 * @throws Error 在 strict 模式下遇到未知插件时抛出
 *
 * @example
 * ```typescript
 * // 先注册可用插件
 * registerPlugins({ demo: { name: 'demo', module: DemoPluginModule } });
 *
 * // 设置环境变量 PLUGINS_ENABLED=demo
 * const plugins = resolvePluginsFromEnv();
 * ```
 */
export function resolvePluginsFromEnv(
	options: ResolvePluginsFromEnvOptions = {},
): PluginInput[] {
	const envName = options.envName ?? 'PLUGINS_ENABLED';
	const separator = options.separator ?? ',';
	const strict = options.strict ?? true;

	const raw = (process.env[envName] ?? '').trim();
	if (!raw) return [];

	const names = raw
		.split(separator)
		.map((s) => s.trim())
		.filter(Boolean);

	const plugins: PluginInput[] = [];
	const unknown: string[] = [];

	for (const name of names) {
		const plugin = registry.get(name);
		if (!plugin) {
			unknown.push(name);
			continue;
		}
		plugins.push(plugin);
	}

	if (strict && unknown.length > 0) {
		const available = getRegisteredPluginNames();
		throw new Error(
			[
				`存在未知插件：${unknown.join(', ')}。`,
				`请先在应用启动时 registerPlugins({ name: PluginModule }) 注册，或移除该配置。`,
				`已注册插件：${available.length > 0 ? available.join(', ') : '(none)'}。`,
			].join('\n'),
		);
	}

	return plugins;
}
