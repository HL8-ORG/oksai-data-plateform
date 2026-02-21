# ESLint 依赖边界防护技术方案

## 一、背景与目标

### 1.1 背景

在 DDD + Hexagonal Architecture + CQRS + Event Sourcing + EDA 的混合架构中，**依赖方向的控制**是保证架构纯净度的关键。然而，仅靠代码审查和团队约定难以持续执行，容易出现：

- 领域层意外依赖基础设施框架（NestJS、MikroORM）
- 共享层污染了框架实现细节
- 依赖方向回流，破坏分层边界

### 1.2 目标

通过 ESLint 的 `no-restricted-imports` 规则，在**编译期**强制执行依赖边界约束：

| 目标 | 说明 |
|:---|:---|
| **自动化边界检查** | 提交代码时自动检测违规导入 |
| **可配置的约束策略** | 支持不同层级的不同约束强度 |
| **渐进式硬化** | 允许项目从宽松策略逐步演进到严格策略 |
| **清晰的错误提示** | 中文错误消息，明确违规原因 |

---

## 二、架构分层与依赖方向

### 2.1 分层架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                          apps/                                  │
│         platform-api, platform-admin-api                       │
│         （应用入口，依赖所有层）                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    composition/                                 │
│                      app-kit                                    │
│         （装配层，组合各能力模块）                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      domains/                                   │
│          identity, tenant, billing...                          │
│         （领域层，纯业务语义）                                    │
│         ⚠️ 禁止依赖框架实现                                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       shared/                                   │
│    kernel, event-store, cqrs, eda, auth, config...             │
│         （共享能力层）                                           │
│         ⚠️ 区分 pure 与 framework-aware                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 依赖方向规则

```
apps → composition → domains → shared
        ↓              ↓          ↓
    adapters       adapters    adapters
        ↓              ↓          ↓
   infrastructure infrastructure infrastructure

规则：
1. 外层可以依赖内层
2. 内层禁止依赖外层
3. 领域层禁止依赖框架实现
4. 共享层中的 pure 模块禁止依赖框架
```

---

## 三、约束策略设计

### 3.1 约束等级

| 等级 | 名称 | 适用场景 | 约束强度 |
|:---|:---|:---|:---|
| **L1** | `domains` | 领域层基础约束 | 禁止依赖装配层、应用专属适配器 |
| **L2** | `pure-domains` | 严格领域层约束 | 在 L1 基础上，禁止依赖任何框架 |
| **L3** | `shared-pure` | 共享层纯模块 | 禁止依赖框架、运行时环境 |
| **L4** | `shared-framework` | 共享层框架模块 | 允许依赖框架，禁止依赖应用层 |

### 3.2 禁止导入清单

#### 3.2.1 领域层基础约束（L1）

```javascript
const DOMAINS_BASE_FORBIDDEN_IMPORTS = [
	// 禁止依赖装配层
	'@oksai/app-kit',
	'@oksai/app-kit/*',
	// 禁止依赖应用专属适配器
	'@oksai/platform-api-adapters',
	'@oksai/platform-admin-adapters'
];
```

#### 3.2.2 纯领域层约束（L2）

```javascript
const PURE_DOMAINS_FORBIDDEN_IMPORTS = [
	...DOMAINS_BASE_FORBIDDEN_IMPORTS,
	// 禁止依赖框架实现
	'@nestjs/*',
	'@mikro-orm/*',
	'ioredis',
	'kafkajs',
	// 禁止依赖框架感知的共享模块
	'@oksai/logger',
	'@oksai/config',
	'@oksai/database',
	'@oksai/messaging-postgres',
	'@oksai/redis'
];
```

#### 3.2.3 共享层纯模块约束（L3）

适用于 `kernel`、`event-store`、`cqrs`、`eda`、`exceptions` 等核心模块：

```javascript
const SHARED_PURE_FORBIDDEN_IMPORTS = [
	'@nestjs/*',
	'@mikro-orm/*',
	'ioredis',
	'kafkajs',
	'prom-client',
	// 禁止读取运行时环境
	// 额外规则：禁止 process.env
];
```

#### 3.2.4 共享层框架模块约束（L4）

适用于 `logger`、`config`、`database`、`redis` 等框架感知模块：

```javascript
const SHARED_FRAMEWORK_FORBIDDEN_IMPORTS = [
	// 禁止依赖应用层
	'@oksai/app-kit',
	// 禁止依赖 domains
	'@oksai/identity',
	'@oksai/tenant'
];
```

---

## 四、实现方案

### 4.1 文件结构

```
tools/
└── eslint/
    └── oksai-guardrails.mjs     # 护栏工具函数

libs/domains/identity/
└── eslint.config.mjs            # 包级配置（引用护栏）

libs/shared/kernel/
└── eslint.config.mjs            # 包级配置
```

### 4.2 护栏工具实现

创建 `tools/eslint/oksai-guardrails.mjs`：

```javascript
/**
 * @description Oksai ESLint 护栏工具
 *
 * 用于沉淀可复用的边界约束规则，减少各包 eslint.config.mjs 的重复
 */

// ============ 禁止导入清单 ============

/**
 * 领域层基础禁止清单
 */
export const DOMAINS_BASE_FORBIDDEN_IMPORTS = [
	'@oksai/app-kit',
	'@oksai/app-kit/*'
];

/**
 * 纯领域层禁止清单（严格 CA）
 */
export const PURE_DOMAINS_FORBIDDEN_IMPORTS = [
	...DOMAINS_BASE_FORBIDDEN_IMPORTS,
	'@nestjs/*',
	'@mikro-orm/*',
	'ioredis',
	'kafkajs',
	'@oksai/logger',
	'@oksai/config',
	'@oksai/database',
	'@oksai/redis',
	'@oksai/messaging-postgres'
];

/**
 * 共享层纯模块禁止清单
 */
export const SHARED_PURE_FORBIDDEN_IMPORTS = [
	'@nestjs/*',
	'@mikro-orm/*',
	'ioredis',
	'kafkajs',
	'prom-client'
];

/**
 * 共享层框架模块禁止清单
 */
export const SHARED_FRAMEWORK_FORBIDDEN_IMPORTS = [
	'@oksai/app-kit',
	'@oksai/identity',
	'@oksai/tenant'
];

// ============ 工厂函数 ============

/**
 * 创建领域层边界护栏
 */
export function createDomainsBoundaryGuardrail(options = {}) {
	const {
		files = ['src/**/*.ts'],
		extraForbiddenImports = [],
		baseForbiddenImports = DOMAINS_BASE_FORBIDDEN_IMPORTS,
		description = '领域层依赖边界约束'
	} = options;

	const patterns = [...new Set([...baseForbiddenImports, ...extraForbiddenImports])];

	return {
		files,
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns
				}
			]
		}
	};
}

/**
 * 创建纯领域层边界护栏（严格 CA）
 */
export function createPureDomainsBoundaryGuardrail(options = {}) {
	return createDomainsBoundaryGuardrail({
		...options,
		baseForbiddenImports: PURE_DOMAINS_FORBIDDEN_IMPORTS,
		description: options?.description ?? '纯领域层依赖边界（严格 CA）'
	});
}

/**
 * 创建共享层纯模块边界护栏
 */
export function createSharedPureBoundaryGuardrail(options = {}) {
	const {
		files = ['src/**/*.ts'],
		extraForbiddenImports = [],
		description = '共享层纯模块依赖边界'
	} = options;

	const patterns = [...new Set([...SHARED_PURE_FORBIDDEN_IMPORTS, ...extraForbiddenImports])];

	return {
		files,
		rules: {
			'no-restricted-imports': [
				'error',
				{ patterns }
			],
			// 禁止直接读取 process.env
			'no-restricted-properties': [
				'error',
				{
					object: 'process',
					property: 'env',
					message: '共享层纯模块禁止使用 process.env；请在外层读取并显式注入配置。'
				}
			]
		}
	};
}

/**
 * 创建共享层框架模块边界护栏
 */
export function createSharedFrameworkBoundaryGuardrail(options = {}) {
	const {
		files = ['src/**/*.ts'],
		extraForbiddenImports = [],
		description = '共享层框架模块依赖边界'
	} = options;

	const patterns = [...new Set([...SHARED_FRAMEWORK_FORBIDDEN_IMPORTS, ...extraForbiddenImports])];

	return {
		files,
		rules: {
			'no-restricted-imports': [
				'error',
				{ patterns }
			]
		}
	};
}
```

### 4.3 包级配置示例

#### 4.3.1 领域包配置（libs/domains/identity/eslint.config.mjs）

```javascript
import rootConfig from '../../../eslint.config.mjs';
import { createPureDomainsBoundaryGuardrail } from '../../../tools/eslint/oksai-guardrails.mjs';
import globals from 'globals';

export default [
	...rootConfig,
	{
		files: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
		languageOptions: {
			globals: { ...globals.jest }
		}
	},
	createPureDomainsBoundaryGuardrail({
		description: '@oksai/identity 纯领域层：禁止依赖框架实现'
	})
];
```

#### 4.3.2 共享层纯模块配置（libs/shared/kernel/eslint.config.mjs）

```javascript
import rootConfig from '../../../eslint.config.mjs';
import { createSharedPureBoundaryGuardrail } from '../../../tools/eslint/oksai-guardrails.mjs';
import globals from 'globals';

export default [
	...rootConfig,
	{
		files: ['src/**/*.spec.ts'],
		languageOptions: {
			globals: { ...globals.jest }
		}
	},
	createSharedPureBoundaryGuardrail({
		description: '@oksai/kernel 共享核心：禁止依赖任何框架'
	})
];
```

#### 4.3.3 共享层框架模块配置（libs/shared/logger/eslint.config.mjs）

```javascript
import rootConfig from '../../../eslint.config.mjs';
import { createSharedFrameworkBoundaryGuardrail } from '../../../tools/eslint/oksai-guardrails.mjs';
import globals from 'globals';

export default [
	...rootConfig,
	{
		files: ['src/**/*.spec.ts'],
		languageOptions: {
			globals: { ...globals.jest }
		}
	},
	createSharedFrameworkBoundaryGuardrail({
		description: '@oksai/logger 框架模块：允许依赖 NestJS，禁止依赖领域层'
	})
];
```

---

## 五、实施计划

### 5.1 阶段一：基础设施搭建

| 任务 | 预估时间 | 说明 |
|:---|:---|:---|
| 创建 `tools/eslint/oksai-guardrails.mjs` | 1h | 护栏工具实现 |
| 更新根 `eslint.config.mjs` | 0.5h | 添加全局共享规则 |

### 5.2 阶段二：核心包落地

| 包 | 约束等级 | 优先级 |
|:---|:---|:---|
| `@oksai/kernel` | L3 (shared-pure) | P0 |
| `@oksai/event-store` | L3 (shared-pure) | P0 |
| `@oksai/cqrs` | L3 (shared-pure) | P0 |
| `@oksai/identity` | L2 (pure-domains) | P1 |
| `@oksai/tenant` | L2 (pure-domains) | P1 |

### 5.3 阶段三：全面推广

| 包 | 约束等级 | 优先级 |
|:---|:---|:---|
| `@oksai/eda` | L3 (shared-pure) | P2 |
| `@oksai/exceptions` | L3 (shared-pure) | P2 |
| `@oksai/logger` | L4 (shared-framework) | P2 |
| `@oksai/config` | L4 (shared-framework) | P2 |

---

## 六、验证方式

### 6.1 本地验证

```bash
# 运行 lint 检查
pnpm run lint

# 或针对特定包
pnpm run lint --filter=@oksai/kernel
```

### 6.2 CI 集成

在 CI 流程中添加 lint 检查步骤：

```yaml
# .github/workflows/ci.yml
- name: Lint Check
  run: pnpm run lint
```

### 6.3 预期错误示例

当领域层违规导入框架时：

```
libs/domains/identity/src/domain/model/user.aggregate.ts
  1:1  error  Unexpected use of banned import '@nestjs/common'  no-restricted-imports

  说明：@oksai/identity 纯领域层：禁止依赖框架实现
```

---

## 七、扩展与定制

### 7.1 添加额外禁止项

```javascript
createPureDomainsBoundaryGuardrail({
	description: '@oksai/identity 纯领域层',
	extraForbiddenImports: [
		'@oksai/some-new-package'  // 添加额外的禁止导入
	]
});
```

### 7.2 自定义文件匹配

```javascript
createPureDomainsBoundaryGuardrail({
	files: ['src/domain/**/*.ts'],  // 只对 domain 目录生效
	description: '仅对 domain 子目录应用约束'
});
```

---

## 八、总结

本技术方案通过 ESLint 的 `no-restricted-imports` 规则，实现了：

1. **自动化边界检查** - 编译期强制执行依赖约束
2. **分层约束策略** - 不同层级应用不同强度的约束
3. **渐进式硬化** - 支持从宽松到严格的演进
4. **可复用工具体** - 护栏函数可跨包复用

这将显著提升架构纯净度，减少人为疏漏，确保项目长期可维护性。
