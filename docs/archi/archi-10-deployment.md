# 部署架构

[返回目录](./archi.md) | [上一章：ClickHouse 表结构](./archi-09-clickhouse.md)

---

## 一、Monorepo 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                     负载均衡器                               │
│                    (Nginx / ALB)                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ platform-api  │   │platform-admin │   │   demo-api    │
│ (Port 3000)   │   │   (Port 3001) │   │   (Port 3002) │
│               │   │               │   │               │
│ 模块化单体    │   │ 模块化单体    │   │ 模块化单体    │
│ - Job        │   │ - Tenant     │   │ - Job        │
│ - Tenant     │   │ - Identity   │   │ - Tenant     │
│ - Identity   │   │ - Billing    │   │              │
│ - Billing    │   │               │   │              │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  PostgreSQL   │   │  ClickHouse   │   │    Redis      │
│ (Event Store) │   │ (Read Model)  │   │   (Cache)     │
└───────┬───────┘   └───────┬───────┘   └───────────────┘
        │                   │
        │                   │
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│    Kafka      │   │   投影处理    │
│ (Event Bus)   │   │ (内置于 API)  │
└───────────────┘   └───────────────┘
```

---

## 二、Docker Compose 本地开发环境

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  # ==================== PostgreSQL (事件存储) ====================
  postgres:
    image: postgres:15
    container_name: oksai-postgres
    environment:
      POSTGRES_USER: ${DB_USER:-oksai}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-oksai123}
      POSTGRES_DB: oksai_event_store
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U oksai"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ==================== ClickHouse (读模型) ====================
  clickhouse:
    image: clickhouse/clickhouse-server:23.8
    container_name: oksai-clickhouse
    ports:
      - "8123:8123"  # HTTP 接口
      - "9000:9000"  # Native 接口
    volumes:
      - clickhouse-data:/var/lib/clickhouse
      - ./clickhouse/init:/docker-entrypoint-initdb.d
    environment:
      CLICKHOUSE_USER: ${CLICKHOUSE_USER:-oksai}
      CLICKHOUSE_PASSWORD: ${CLICKHOUSE_PASSWORD:-oksai123}
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "localhost:8123/ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ==================== Kafka (事件总线) ====================
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: oksai-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    volumes:
      - zookeeper-data:/var/lib/zookeeper/data

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: oksai-kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    volumes:
      - kafka-data:/var/lib/kafka/data
    healthcheck:
      test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
      interval: 30s
      timeout: 10s
      retries: 5

  # ==================== Redis (缓存) ====================
  redis:
    image: redis:7-alpine
    container_name: oksai-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ==================== 应用服务 ====================
  platform-api:
    build:
      context: ..
      dockerfile: apps/platform-api/Dockerfile
    container_name: oksai-platform-api
    depends_on:
      postgres:
        condition: service_healthy
      clickhouse:
        condition: service_healthy
      kafka:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      PORT: 3000
      DATABASE_URL: postgresql://oksai:oksai123@postgres:5432/oksai_event_store
      CLICKHOUSE_URL: http://clickhouse:8123
      KAFKA_BROKERS: kafka:9092
      REDIS_URL: redis://redis:6379
    volumes:
      - ../libs:/app/libs
      - ../apps:/app/apps
    command: pnpm --filter @oksai/app-platform-api dev

volumes:
  postgres-data:
  clickhouse-data:
  zookeeper-data:
  kafka-data:
  redis-data:
```

---

## 三、Kubernetes 生产部署

### 3.1 平台 API 部署

```yaml
# k8s/platform-api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: platform-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: platform-api
  template:
    metadata:
      labels:
        app: platform-api
    spec:
      containers:
        - name: platform-api
          image: registry.example.com/oksai-platform-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: oksai-secrets
                  key: database-url
            - name: CLICKHOUSE_URL
              value: "http://clickhouse:8123"
            - name: KAFKA_BROKERS
              value: "kafka-0.kafka:9092,kafka-1.kafka:9092,kafka-2.kafka:9092"
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: oksai-secrets
                  key: redis-url
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: platform-api
  namespace: production
spec:
  selector:
    app: platform-api
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: platform-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: platform-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### 3.2 ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: oksai-config
  namespace: production
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  CLICKHOUSE_URL: "http://clickhouse:8123"
  KAFKA_BROKERS: "kafka-0.kafka:9092,kafka-1.kafka:9092,kafka-2.kafka:9092"
```

---

## 四、CI/CD 流水线

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test

  build:
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Build Docker images
        run: |
          docker build -t registry.example.com/oksai-platform-api:${{ github.sha }} -f apps/platform-api/Dockerfile .
          docker build -t registry.example.com/oksai-platform-admin-api:${{ github.sha }} -f apps/platform-admin-api/Dockerfile .

      - name: Push to registry
        run: |
          echo ${{ secrets.REGISTRY_PASSWORD }} | docker login -u ${{ secrets.REGISTRY_USER }} --password-stdin registry.example.com
          docker push registry.example.com/oksai-platform-api:${{ github.sha }}
          docker push registry.example.com/oksai-platform-admin-api:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/platform-api platform-api=registry.example.com/oksai-platform-api:${{ github.sha }} -n production
          kubectl set image deployment/platform-admin-api platform-admin-api=registry.example.com/oksai-platform-admin-api:${{ github.sha }} -n production
          kubectl rollout status deployment/platform-api -n production
          kubectl rollout status deployment/platform-admin-api -n production
```

---

## 五、监控与日志

### 5.1 健康检查端点

```typescript
// apps/platform-api/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator, RedisHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}
```

### 5.2 Prometheus 指标

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'oksai-platform-api'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        regex: platform-api
        action: keep
```

---

## 六、总结

### 架构特点

| 特点 | 说明 |
|:---|:---|
| **Monorepo 统一** | 单一代码仓库，统一依赖管理 |
| **模块化单体** | 领域模块独立，可演进为微服务 |
| **CQRS 分离** | 写模型 PostgreSQL，读模型 ClickHouse |
| **事件驱动** | Kafka 消息总线，Outbox/Inbox 模式 |
| **多租户隔离** | 全链路租户上下文 |
| **可扩展** | 支持 HPA 水平扩展 |
| **高可用** | 多副本部署，健康检查 |

### 部署选项

1. **单节点部署**：Docker Compose，适合开发和小规模生产
2. **Kubernetes 部署**：适合大规模生产环境
3. **混合部署**：核心服务 K8s，分析服务独立部署

---

[返回目录](./archi.md)
