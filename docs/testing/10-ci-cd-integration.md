# CI/CD 集成

[返回目录](./README.md) | [上一章：端到端测试](./09-e2e-testing.md)

---

## 一、CI/CD 测试策略

### 1.1 测试流水线设计

```
┌─────────────────────────────────────────────────────────┐
│                    代码提交触发                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  阶段1: 快速反馈（5分钟内）                              │
│  ├── Lint 检查                                          │
│  ├── 类型检查                                           │
│  └── 单元测试（核心领域逻辑）                            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  阶段2: 集成验证（10-15分钟）                            │
│  ├── 集成测试                                           │
│  └── API 契约测试                                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  阶段3: 完整验证（20-30分钟）                            │
│  ├── E2E 测试                                           │
│  └── 性能测试                                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  阶段4: 部署                                             │
│  ├── 自动部署到测试环境                                  │
│  └── 手动审批后部署到生产环境                            │
└─────────────────────────────────────────────────────────┘
```

### 1.2 测试执行时机

| 测试类型 | PR 创建 | 合并到主分支 | 发布前 | 定期执行 |
|:---|:---:|:---:|:---:|:---:|
| **Lint 检查** | ✅ | ✅ | ✅ | ❌ |
| **单元测试** | ✅ | ✅ | ✅ | ❌ |
| **集成测试** | ✅ | ✅ | ✅ | ✅ |
| **E2E 测试** | ❌ | ✅ | ✅ | ✅ |
| **性能测试** | ❌ | ❌ | ✅ | ✅ |

---

## 二、GitHub Actions 配置

### 2.1 基础工作流

```yaml
# .github/workflows/test.yml
name: 测试流水线

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # ==================== 阶段1: 快速反馈 ====================
  lint-and-unit-test:
    name: Lint 和单元测试
    runs-on: ubuntu-latest
    
    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 安装 pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: Lint 检查
        run: pnpm run lint

      - name: 类型检查
        run: pnpm run type-check

      - name: 单元测试
        run: pnpm run test:unit --coverage

      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

  # ==================== 阶段2: 集成测试 ====================
  integration-test:
    name: 集成测试
    runs-on: ubuntu-latest
    needs: lint-and-unit-test

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 安装 pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 运行集成测试
        run: pnpm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

  # ==================== 阶段3: E2E 测试 ====================
  e2e-test:
    name: E2E 测试
    runs-on: ubuntu-latest
    needs: integration-test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 安装 pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 运行 E2E 测试
        run: pnpm run test:e2e
        env:
          NODE_ENV: test

      - name: 上传 E2E 测试报告
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-test-report
          path: tests/e2e/reports/
```

### 2.2 Matrix 构建

```yaml
# .github/workflows/test-matrix.yml
name: 多环境测试

on: [push, pull_request]

jobs:
  test:
    name: 测试 (Node ${{ matrix.node-version }}, OS ${{ matrix.os }})
    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: false
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, windows-latest, macos-latest]

    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 安装 pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: 设置 Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 运行测试
        run: pnpm run test:unit
```

---

## 三、测试覆盖率

### 3.1 覆盖率配置

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/domain/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/application/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.int-spec.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/**/index.ts',
    '!src/main.ts'
  ],
  coverageReporters: ['text', 'lcov', 'html', 'json-summary']
};
```

### 3.2 覆盖率徽章

```markdown
<!-- README.md -->
[![Coverage Status](https://codecov.io/gh/your-org/your-repo/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/your-repo)
```

### 3.3 PR 覆盖率检查

```yaml
# .github/workflows/coverage-check.yml
name: 覆盖率检查

on: [pull_request]

jobs:
  coverage:
    name: 检查测试覆盖率
    runs-on: ubuntu-latest

    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 安装 pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 运行测试并生成覆盖率
        run: pnpm run test:unit --coverage

      - name: 发布覆盖率报告到 PR
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
          delete-old-comments: true
```

---

## 四、质量门禁

### 4.1 SonarQube 集成

```yaml
# .github/workflows/sonarqube.yml
name: SonarQube 分析

on:
  push:
    branches: [main, develop]
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  sonarqube:
    name: SonarQube 扫描
    runs-on: ubuntu-latest

    steps:
      - name: 检出代码
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 完整历史记录用于 blame 信息

      - name: 安装 pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 运行测试并生成覆盖率
        run: pnpm run test:unit --coverage

      - name: SonarQube 扫描
        uses: SonarSource/sonarqube-scan-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
```

```properties
# sonar-project.properties
sonar.projectKey=your-project-key
sonar.projectName=Your Project Name
sonar.projectVersion=1.0

# 源代码配置
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.spec.ts,**/*.test.ts
sonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**

# 覆盖率配置
sonar.javascript.lcov.reportPaths=coverage/lcov.info

# 质量门禁
sonar.qualitygate.wait=true
sonar.qualitygate.timeout=300
```

### 4.2 质量门禁规则

| 指标 | 要求 | 说明 |
|:---|:---|:---|
| **代码覆盖率** | ≥ 80% | 领域层 ≥ 90% |
| **重复代码** | < 3% | 避免代码重复 |
| **代码异味** | 0 | 无严重代码异味 |
| **安全漏洞** | 0 | 无已知安全漏洞 |
| **技术债务** | < 5% | 控制技术债务比例 |

---

## 五、测试报告

### 5.1 JUnit 报告

```javascript
// jest.config.js
module.exports = {
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './reports',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ]
};
```

### 5.2 HTML 报告

```yaml
# .github/workflows/test-report.yml
name: 测试报告

on: [push, pull_request]

jobs:
  test:
    name: 生成测试报告
    runs-on: ubuntu-latest

    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 安装 pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 运行测试
        run: pnpm run test:unit --coverage

      - name: 生成 HTML 报告
        run: pnpm run test:report

      - name: 上传测试报告
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: coverage/lcov-report/

      - name: 发布测试报告到 GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./coverage/lcov-report
```

### 5.3 测试结果通知

```yaml
# .github/workflows/test-notification.yml
name: 测试通知

on:
  workflow_run:
    workflows: ["测试流水线"]
    types:
      - completed

jobs:
  notify:
    name: 发送通知
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'failure'

    steps:
      - name: Slack 通知
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          fields: repo,message,commit,author,action,eventName,ref,workflow
          text: '测试失败，请检查'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 六、性能测试

### 6.1 性能基准测试

```typescript
// job-throughput.perf-spec.ts
import { performance } from 'perf_hooks';

describe('任务性能基准测试', () => {
  it('创建任务应该在100ms内完成', async () => {
    const startTime = performance.now();

    await jobService.createJob(jobProps);

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100);
  });

  it('批量创建任务（1000个）应该在10秒内完成', async () => {
    const startTime = performance.now();

    const promises = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(jobService.createJob({ ...jobProps, id: `job-${i}` }));
    }
    await Promise.all(promises);

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;

    expect(duration).toBeLessThan(10);
  });
});
```

### 6.2 负载测试（使用 k6）

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // 2分钟内增加到100个用户
    { duration: '5m', target: 100 },  // 保持100个用户5分钟
    { duration: '2m', target: 200 },  // 2分钟内增加到200个用户
    { duration: '5m', target: 200 },  // 保持200个用户5分钟
    { duration: '2m', target: 0 },    // 2分钟内降至0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%的请求应该在500ms内完成
    http_req_failed: ['rate<0.01'],   // 失败率应该小于1%
  },
};

export default function () {
  const url = 'http://localhost:3000/api/jobs';
  const payload = JSON.stringify({
    customerId: 'customer-123',
    tenantId: 'tenant-456',
    tasks: [{ taskId: 'task-1', name: '开发任务', budget: 2000 }]
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    '状态码为 201': (r) => r.status === 201,
    '响应时间 < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### 6.3 性能测试工作流

```yaml
# .github/workflows/performance-test.yml
name: 性能测试

on:
  schedule:
    - cron: '0 2 * * *'  # 每天凌晨2点运行
  workflow_dispatch:      # 手动触发

jobs:
  performance-test:
    name: 运行性能测试
    runs-on: ubuntu-latest

    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 安装 k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: 启动应用
        run: |
          pnpm install
          pnpm run build
          pnpm run start:prod &

      - name: 等待应用启动
        run: sleep 10

      - name: 运行性能测试
        run: k6 run tests/performance/load-test.js
        env:
          AUTH_TOKEN: ${{ secrets.TEST_AUTH_TOKEN }}

      - name: 上传性能测试报告
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: tests/performance/reports/
```

---

## 七、并行测试执行

### 7.1 Jest 并行配置

```javascript
// jest.config.js
module.exports = {
  // 单元测试可以并行
  testMatch: ['**/*.spec.ts'],
  maxWorkers: '50%',  // 使用50%的CPU核心
  
  // 集成测试串行执行
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/*.spec.ts'],
      maxWorkers: '50%'
    },
    {
      displayName: 'integration',
      testMatch: ['**/*.int-spec.ts'],
      maxWorkers: 1,  // 串行执行
      testTimeout: 30000
    }
  ]
};
```

### 7.2 CI 分片测试

```yaml
# .github/workflows/parallel-test.yml
name: 并行测试

on: [push, pull_request]

jobs:
  test:
    name: 测试分片 ${{ matrix.shard }}
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]

    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 安装 pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 运行测试分片
        run: pnpm run test:unit --shard=${{ matrix.shard }}

  merge-results:
    name: 合并测试结果
    needs: test
    runs-on: ubuntu-latest

    steps:
      - name: 下载所有分片结果
        uses: actions/download-artifact@v3
        with:
          name: test-results

      - name: 合并覆盖率报告
        run: |
          # 合并多个分片的覆盖率报告
          pnpm run merge-coverage
```

---

## 八、缓存优化

### 8.1 依赖缓存

```yaml
# .github/workflows/test.yml
jobs:
  test:
    steps:
      - name: 安装 pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: 缓存依赖
        uses: actions/cache@v3
        with:
          path: |
            ~/.pnpm-store
            node_modules
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-
```

### 8.2 构建缓存

```yaml
- name: 缓存构建产物
  uses: actions/cache@v3
  with:
    path: |
      dist
      .tsbuildinfo
    key: ${{ runner.os }}-build-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-build-
```

---

## 九、测试环境管理

### 9.1 多环境配置

```yaml
# .github/workflows/deploy.yml
name: 部署

on:
  push:
    branches: [main, develop]

jobs:
  deploy-test:
    name: 部署到测试环境
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: test

    steps:
      - name: 部署到测试环境
        run: |
          # 部署脚本
          echo "部署到测试环境"

  deploy-prod:
    name: 部署到生产环境
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    needs: deploy-test

    steps:
      - name: 部署到生产环境
        run: |
          # 部署脚本
          echo "部署到生产环境"
```

### 9.2 环境变量管理

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: 运行测试
        run: pnpm run test:integration
        env:
          NODE_ENV: test
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          REDIS_URL: ${{ secrets.TEST_REDIS_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

---

## 十、最佳实践总结

### 10.1 CI/CD 测试清单

- ✅ **快速反馈**：Lint 和单元测试在 5 分钟内完成
- ✅ **分层执行**：先执行单元测试，再执行集成测试，最后执行 E2E 测试
- ✅ **覆盖率检查**：确保覆盖率不低于 80%
- ✅ **质量门禁**：使用 SonarQube 等工具检查代码质量
- ✅ **测试报告**：生成详细的测试报告和覆盖率报告
- ✅ **并行执行**：利用并行执行加速测试
- ✅ **缓存优化**：缓存依赖和构建产物
- ✅ **环境隔离**：不同环境使用不同的配置和密钥
- ✅ **通知机制**：测试失败时及时通知团队
- ✅ **定期执行**：定期执行性能测试和安全扫描

### 10.2 常见问题

| 问题 | 解决方案 |
|:---|:---|
| **测试执行慢** | 并行执行、分片测试、缓存优化 |
| **测试不稳定** | 隔离测试数据、清理测试环境、增加重试机制 |
| **覆盖率低** | 增加单元测试、使用覆盖率工具识别未覆盖代码 |
| **环境差异** | 使用 Docker 容器确保环境一致 |
| **密钥管理** | 使用 GitHub Secrets 管理敏感信息 |

---

## 十一、Package.json 脚本配置

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts",
    "type-check": "tsc --noEmit",
    
    "test:unit": "jest --testMatch='**/*.spec.ts'",
    "test:integration": "jest --testMatch='**/*.int-spec.ts' --runInBand",
    "test:e2e": "jest --testMatch='**/*.e2e-spec.ts' --runInBand --detectOpenHandles",
    "test:performance": "jest --testMatch='**/*.perf-spec.ts'",
    
    "test": "pnpm run test:unit && pnpm run test:integration",
    "test:all": "pnpm run test:unit && pnpm run test:integration && pnpm run test:e2e",
    
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    
    "test:report": "jest --coverage --coverageReporters=html",
    "test:ci": "jest --ci --coverage --reporters=default --reporters=jest-junit"
  }
}
```

---

[返回目录](./README.md)
