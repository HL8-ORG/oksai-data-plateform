import {
	registerPlugins,
	clearPluginRegistry,
	getRegisteredPluginNames,
	resolvePluginsFromEnv,
	type PluginInput,
	type RegisterPluginsOptions,
	type ResolvePluginsFromEnvOptions,
} from '../lib/plugins/plugin-registry';

describe('PluginRegistry', () => {
	beforeEach(() => {
		clearPluginRegistry();
	});

	describe('registerPlugins', () => {
		it('应该成功注册插件', () => {
			const plugin: PluginInput = { name: 'test-plugin', module: class TestPlugin {} };

			registerPlugins({ 'test-plugin': plugin });

			expect(getRegisteredPluginNames()).toContain('test-plugin');
		});

		it('应该成功注册多个插件', () => {
			const plugin1: PluginInput = { name: 'plugin-1', module: class Plugin1 {} };
			const plugin2: PluginInput = { name: 'plugin-2', module: class Plugin2 {} };

			registerPlugins({ 'plugin-1': plugin1, 'plugin-2': plugin2 });

			expect(getRegisteredPluginNames()).toEqual(['plugin-1', 'plugin-2']);
		});

		it('重复注册同名插件应该抛出异常', () => {
			const plugin: PluginInput = { name: 'test-plugin', module: class TestPlugin {} };
			registerPlugins({ 'test-plugin': plugin });

			expect(() => registerPlugins({ 'test-plugin': plugin })).toThrow('重复注册插件：test-plugin');
		});

		it('设置 allowOverride 时应该允许覆盖', () => {
			const plugin1: PluginInput = { name: 'test-plugin', module: class TestPlugin1 {} };
			const plugin2: PluginInput = { name: 'test-plugin', module: class TestPlugin2 {} };
			registerPlugins({ 'test-plugin': plugin1 });

			expect(() =>
				registerPlugins({ 'test-plugin': plugin2 }, { allowOverride: true })
			).not.toThrow();
		});

		it('空名称应该被忽略', () => {
			const plugin: PluginInput = { name: 'valid-plugin', module: class ValidPlugin {} };

			registerPlugins({ '': plugin, 'valid-plugin': plugin });

			expect(getRegisteredPluginNames()).toEqual(['valid-plugin']);
		});
	});

	describe('getRegisteredPluginNames', () => {
		it('应该返回排序后的插件名称列表', () => {
			const plugin: PluginInput = { name: 'test', module: class Test {} };

			registerPlugins({ zebra: plugin, alpha: plugin, middle: plugin });

			expect(getRegisteredPluginNames()).toEqual(['alpha', 'middle', 'zebra']);
		});

		it('无注册插件时应返回空数组', () => {
			expect(getRegisteredPluginNames()).toEqual([]);
		});
	});

	describe('clearPluginRegistry', () => {
		it('应该清空所有已注册插件', () => {
			const plugin: PluginInput = { name: 'test', module: class Test {} };
			registerPlugins({ 'test-plugin': plugin });

			clearPluginRegistry();

			expect(getRegisteredPluginNames()).toEqual([]);
		});
	});

	describe('resolvePluginsFromEnv', () => {
		const originalEnv = process.env;

		beforeEach(() => {
			process.env = { ...originalEnv };
		});

		afterEach(() => {
			process.env = originalEnv;
		});

		it('应该从环境变量解析启用的插件', () => {
			const plugin1: PluginInput = { name: 'plugin-1', module: class Plugin1 {} };
			const plugin2: PluginInput = { name: 'plugin-2', module: class Plugin2 {} };
			registerPlugins({ 'plugin-1': plugin1, 'plugin-2': plugin2 });
			process.env.PLUGINS_ENABLED = 'plugin-1,plugin-2';

			const plugins = resolvePluginsFromEnv();

			expect(plugins).toHaveLength(2);
			expect(plugins[0].name).toBe('plugin-1');
			expect(plugins[1].name).toBe('plugin-2');
		});

		it('环境变量为空时应返回空数组', () => {
			delete process.env.PLUGINS_ENABLED;

			const plugins = resolvePluginsFromEnv();

			expect(plugins).toEqual([]);
		});

		it('strict 模式下遇到未知插件应抛出异常', () => {
			process.env.PLUGINS_ENABLED = 'unknown-plugin';

			expect(() => resolvePluginsFromEnv({ strict: true })).toThrow('存在未知插件');
		});

		it('非 strict 模式下应忽略未知插件', () => {
			const plugin: PluginInput = { name: 'known-plugin', module: class Known {} };
			registerPlugins({ 'known-plugin': plugin });
			process.env.PLUGINS_ENABLED = 'known-plugin,unknown-plugin';

			const plugins = resolvePluginsFromEnv({ strict: false });

			expect(plugins).toHaveLength(1);
			expect(plugins[0].name).toBe('known-plugin');
		});

		it('应该支持自定义环境变量名', () => {
			const plugin: PluginInput = { name: 'test-plugin', module: class Test {} };
			registerPlugins({ 'test-plugin': plugin });
			process.env.CUSTOM_PLUGINS = 'test-plugin';

			const plugins = resolvePluginsFromEnv({ envName: 'CUSTOM_PLUGINS' });

			expect(plugins).toHaveLength(1);
		});

		it('应该支持自定义分隔符', () => {
			const plugin1: PluginInput = { name: 'plugin-1', module: class Plugin1 {} };
			const plugin2: PluginInput = { name: 'plugin-2', module: class Plugin2 {} };
			registerPlugins({ 'plugin-1': plugin1, 'plugin-2': plugin2 });
			process.env.PLUGINS_ENABLED = 'plugin-1;plugin-2';

			const plugins = resolvePluginsFromEnv({ separator: ';' });

			expect(plugins).toHaveLength(2);
		});

		it('应该自动去除空白字符', () => {
			const plugin: PluginInput = { name: 'test-plugin', module: class Test {} };
			registerPlugins({ 'test-plugin': plugin });
			process.env.PLUGINS_ENABLED = '  test-plugin  ';

			const plugins = resolvePluginsFromEnv();

			expect(plugins).toHaveLength(1);
		});
	});
});
