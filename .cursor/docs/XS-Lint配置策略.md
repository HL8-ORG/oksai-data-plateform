## XS-Lint 配置策略（ESLint + Prettier）

### 目标与范围

本仓库的 lint 体系以 **TypeScript 为主**，目标是：

- **统一代码质量基线**：在 monorepo 内各 app/lib 有一致的规则与默认忽略项。
- **尽量贴近真实运行环境**：对需要类型信息的项目启用“类型感知 lint”（type-aware）。
- **格式化与校验分离但一致**：使用 Prettier 作为格式化事实标准，并通过 ESLint 集成保证一致性。

### 关键结论（当前默认策略）

- **ESLint 使用 Flat Config**（`eslint.config.mjs`），不会自动向子目录继承；子项目必须显式 `import` 根配置。
- **根配置提供“全仓默认基线”**：只启用“不依赖类型信息”的 TypeScript 推荐规则，避免每次 lint 都强依赖各项目 tsconfig。
- **子项目按需启用 type-aware 规则**：例如 `apps/fastify-api` 追加 `typescript-eslint` 的 `recommendedTypeChecked`。
- **Prettier 通过 ESLint 插件接入**：使用 `eslint-plugin-prettier/recommended`，并统一 `endOfLine=auto` 以兼容 WSL/Linux/Windows 换行差异。

### 文件与职责分工

- **根 ESLint 配置**：`eslint.config.mjs`
    - 全仓忽略项（`dist/`、`node_modules/`、`coverage/` 等）
    - JS/TS 的推荐规则基线
    - Prettier 集成与少量全仓通用规则

- **子项目 ESLint 配置**：`apps/<app>/eslint.config.mjs` 或 `libs/<lib>/eslint.config.mjs`
    - `import rootConfig from '../../eslint.config.mjs'` 显式继承
    - 追加/覆盖：项目专用 globals（如 jest）、type-aware 规则、运行时语义（CJS/ESM）

### 根配置（基线）策略说明

根配置（`eslint.config.mjs`）的规则来源包含：

- `@eslint/js`：基础 JS 推荐规则（作为通用底座）
- `typescript-eslint`：`configs.recommended`（**不依赖类型信息**）
- `eslint-plugin-prettier/recommended`：将 Prettier 结果以 ESLint 规则形式强制执行
- `globals`：预置 Node 全局变量（避免误报）

为什么根只启用“不依赖类型信息”的 TS 规则：

- monorepo 里每个包的 `tsconfig` 可能不同；强制 type-aware 会让 lint 变慢，并且更容易出现“找不到 tsconfig/包含范围不匹配”的误报。
- 将 type-aware 下沉到 app/lib，可按需开启、按包调优。

### 子项目 type-aware lint 策略

以 `apps/fastify-api/eslint.config.mjs` 为例：

- 在继承根配置后，追加 `...tseslint.configs.recommendedTypeChecked`
- `parserOptions.projectService: true`：由 `typescript-eslint` 自动管理项目服务
- `tsconfigRootDir: import.meta.dirname`：确保从子项目目录解析 tsconfig
- `globals` 同时合并 `node` 与 `jest`
- 针对服务端入口的常见规则示例：
    - `@typescript-eslint/no-floating-promises`：提示未处理的 Promise（可用 `void` 明确“刻意忽略”）

### 执行入口（命令与 CI/本地行为）

#### 包级 lint

约定：每个 app/lib 都应提供 `scripts.lint`，由 Turbo 汇总执行。

示例：`apps/fastify-api/package.json`

- 当前命令为（默认带 `--fix`）：
    - `eslint "{src,apps,libs,test}/**/*.ts" --fix`

说明：

- `--fix` 会自动修复可修复问题，适合本地开发；若未来需要更严格的 CI 校验，建议增加 `lint:check`（不带 `--fix`）与 `lint:fix`（带 `--fix`）区分职责。

#### 仓库级 lint（Turbo）

根 `package.json` 提供：

- `pnpm turbo run lint --affected`（只跑受影响包）

`turbo.json` 中 `lint` task 配置为：

- `cache: false`、`outputs: []`：保证 lint 每次都真实执行，不复用缓存结果。

### 与格式化（Prettier / pretty-quick）的关系

- **Prettier 配置**：当前在根 `package.json#prettier` 中维护（如 `printWidth=120`、`singleQuote=true`、tab 缩进等）。
- **提交前格式化**：根 `husky` 的 `pre-commit` 使用 `pretty-quick --staged`，确保提交内容尽量格式化一致。
- **ESLint 与 Prettier 的边界**：
    - Prettier 负责“格式”
    - ESLint 负责“质量与可维护性”
    - 通过 `eslint-plugin-prettier` 将 Prettier 结果显式纳入 ESLint，减少“格式化工具与 lint 工具互相打架”。

### 新增包（app/lib）如何接入 lint（必做清单）

- 在包目录新增 `eslint.config.mjs`，并显式扩展根配置：
    - apps：通常需要 node/jest globals、以及按需启用 type-aware
    - libs：可先仅继承根配置，必要时再启用 type-aware（视复杂度与性能要求）
- 在包的 `package.json` 增加 `scripts.lint`
- 确保包在 `pnpm-workspace.yaml` 的扫描范围内（当前为 `apps/*` 与 `libs/**/*`）

### 常见问题（FAQ / 排错）

#### 1) 为什么我在子目录运行 eslint 没有应用根规则？

因为 Flat Config **不会自动继承**。必须在子项目 `eslint.config.mjs` 中显式 `import` 并扩展根配置。

#### 2) type-aware lint 报“找不到 tsconfig / project 相关”错误怎么办？

优先检查：

- `tsconfigRootDir` 是否为 `import.meta.dirname`
- 子项目 `tsconfig.json` 的 `include/exclude` 是否覆盖了被 lint 的文件
- 是否在错误的工作目录执行（建议在包目录执行 `pnpm lint`）

#### 3) `no-floating-promises` 报警怎么处理？

三种常见处理方式：

- `await`：确实要等待结果
- `.catch(...)`：显式处理拒绝分支
- `void someAsync()`：明确“刻意不等待”（例如 `bootstrap()` 入口）
