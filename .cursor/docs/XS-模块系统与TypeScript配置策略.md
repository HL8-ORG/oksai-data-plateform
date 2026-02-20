# XS-模块系统与 TypeScript 配置策略

## 目标与边界

本仓库是 **NestJS 服务端 monorepo**（pnpm workspace），模块化配置的目标是：

- **运行稳定**：生产环境 `node dist/*.js` 可直接运行，避免 ESM/CJS 混用导致的运行时错误。
- **解析贴近 Node 现实**：TypeScript 在开发/类型检查阶段尽量与 Node 的实际解析规则一致（尤其是 `package.json#exports` / 条件导出）。
- **分层清晰**：根配置提供全仓基线；每个 app/lib 仅做最小覆盖。
- **可渐进演进**：未来如果某个包需要切换到 ESM（或双产物），能在局部演进而不全仓重构。

## 核心结论（当前仓库的默认策略）

- **运行时默认采用 CommonJS 语义（CJS）**
    - 依据：根与 `apps/*` 的 `package.json` 目前未声明 `"type": "module"`，Node 会按 CJS 默认规则解释 `dist/*.js`。
    - 对服务端应用来说，这是 Nest 生态最“稳妥默认”的路径。

- **根 TypeScript 基线（`tsconfig.base.json`）使用 `NodeNext` 语义**
    - 重点不是“强制 ESM”，而是让 TS 的 **模块解析** 更贴近 Node 现实世界（支持 `exports`/条件导出等）。

- **构建阶段在 app 内覆盖为 `Node16`（`tsconfig.build.json`）**
    - 目的：让 `nest build` 的编译产物语义与 Node 的模块解析/发包规则更一致，同时保持运行时仍可按 CJS 默认语义运行。

## TypeScript 配置分层（monorepo）

### 1) 根基线：`tsconfig.base.json`

定位：**所有子项目共享的编译与类型检查基线**。

关键点：

- `module: "nodenext"` + `moduleResolution: "nodenext"`
    - **解决的问题**：现代依赖大量使用 `package.json#exports`/条件导出（如区分 `import`/`require`），使用 `nodenext` 可减少“TS 能过但运行时 Node 找不到/走错入口”的问题。
    - **不等于**：立刻把运行时切成纯 ESM。运行时模块语义仍由各包的 `package.json#type` 与 Node 行为决定。

### 2) 工作区编排：`tsconfig.json`（根）

定位：用于 `tsc -b` 的 **project references 汇总入口**，提升增量构建与跨项目类型检查体验。

约定：

- 根 `tsconfig.json` 只维护 `references`，不做具体编译选项。
- 每个子项目的 `tsconfig.json` 开启 `composite: true`，以支持 references 与增量缓存。

### 3) 子项目 IDE/类型检查：`apps/<app>/tsconfig.json`

定位：**给 IDE 与类型检查用**，通常：

- `noEmit: true`：避免 IDE/类型检查阶段产生产物。
- `composite: true`：支持 references 与增量。

### 4) 子项目构建：`apps/<app>/tsconfig.build.json`

定位：**只给构建用**（`nest build` 默认读取此文件，除非在 `nest-cli.json` 里显式指定）。

当前 `apps/fastify-api` 的策略：

- 覆盖：
    - `module: "node16"`
    - `moduleResolution: "node16"`
    - `outDir: "./dist"`
- 说明：
    - TS 约束：当 `moduleResolution` 是 `"node16"` 时，`module` 必须是 `"node16"`（否则会触发 TS5110）。
    - 运行时仍偏 CJS：只要该包未声明 `"type": "module"`，Node 对 `.js` 默认按 CJS 语义执行。

## 如何决定 ESM vs CommonJS（决策流程）

### 选择 CommonJS（推荐默认）当：

- 这是一个 **服务端应用**（Nest API），追求“少踩坑、快迭代”。
- 你的测试/脚本生态以 Jest、传统 require 兼容为主。
- 你没有明确的 ESM-only 依赖要求。

### 选择 ESM 当（满足任一“硬需求”）：

- 你必须使用 **ESM-only** 依赖，或需要更彻底的 ESM 能力（例如一些只提供 ESM 入口的包）。
- 你要发布给外部使用的库，并希望以 ESM 作为主要产物（或做 ESM+CJS 双产物）。

### 选择 ESM 的最小改动清单（按包局部切换）

如果某个包要切换到 ESM，推荐按“局部升级”做：

- 在该包 `package.json` 增加 `"type": "module"`
- 让该包构建 `tsconfig.build.json` 采用与 ESM 匹配的 `module`/`moduleResolution` 组合（通常还是 `nodenext` 或 `node16`）
- 同步更新测试工具链（Jest/ts-jest 的 ESM 配置、或迁移到更 ESM 友好的测试方案）
- 必要时使用 `.mts/.cts` 明确文件语义边界（在混用场景尤其有效）

## `.tsbuildinfo`（增量缓存）策略

- `*.tsbuildinfo` 是 TypeScript 在开启 `incremental` / `composite` 时生成的 **增量编译缓存**。
- 这些文件是构建产物/缓存，应当 **不入库**，以避免：
    - 不同机器/路径导致的缓存不可复用
    - PR 噪音与冲突
    - 误导构建系统的增量判断

当前仓库约定：通过 `.gitignore` 忽略所有 `*.tsbuildinfo`（包括 `dist/` 内）。

## 常见问题（FAQ）

### 1) 为什么根用 `nodenext`，构建用 `node16`？

- 根的 `nodenext` 主要为了 **“解析贴近 Node + 兼容现代依赖 exports”**，让类型检查阶段更接近真实运行时。
- 构建阶段用 `node16` 是为了让 `nest build` 的产物在 Node 环境下更一致、更可预测，同时满足 TS 对 `module`/`moduleResolution` 组合的约束。

### 2) 这会不会导致我“其实在用 ESM”？

不会。是否按 ESM 运行，最终取决于 **Node**：

- 包级 `package.json#type`
- 文件扩展名（`.js/.cjs/.mjs`）
- Node 的 ESM/CJS 规则

当前仓库没有启用 `"type": "module"`，所以默认仍以 CJS 语义运行为主。

## 操作指令（最常用）

- 类型检查（全仓，project references）：

```bash
pnpm exec tsc -b --pretty false
```

- 构建单个 app：

```bash
pnpm -C apps/fastify-api build
```

- 运行构建产物：

```bash
node apps/fastify-api/dist/main.js
```
