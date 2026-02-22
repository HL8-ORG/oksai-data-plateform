-- ============================================================================
-- 集成事件 Outbox 表
--
-- 用途：存储待发布的集成事件，实现 Transactional Outbox 模式
--
-- 状态流转：
--   pending → processing → published
--                ↓
--              failed → (retry) → processing
--                ↓
--              dead (超过最大重试次数)
--
-- @module @oksai/eda
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_outbox (
    -- 主键
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 事件标识（全局唯一）
    event_id        VARCHAR(36) NOT NULL,

    -- 租户标识（必填，用于多租户隔离）
    tenant_id       VARCHAR(36) NOT NULL,

    -- 事件元数据
    event_name      VARCHAR(255) NOT NULL,
    event_version   INTEGER NOT NULL DEFAULT 1,
    partition_key   VARCHAR(255) NOT NULL,

    -- 事件负载（JSON 格式的 OksaiIntegrationEvent）
    payload         JSONB NOT NULL,

    -- 状态管理
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    retry_count     INTEGER NOT NULL DEFAULT 0,
    next_retry_at   TIMESTAMP WITH TIME ZONE,
    last_error      TEXT,

    -- 时间戳
    occurred_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 索引
-- ============================================================================

-- 事件 ID 唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_outbox_event_id
    ON integration_outbox(event_id);

-- 租户 ID 索引（多租户查询）
CREATE INDEX IF NOT EXISTS idx_integration_outbox_tenant_id
    ON integration_outbox(tenant_id);

-- 状态索引（Worker 轮询查询）
CREATE INDEX IF NOT EXISTS idx_integration_outbox_status
    ON integration_outbox(status);

-- 事件名称索引（按事件类型查询）
CREATE INDEX IF NOT EXISTS idx_integration_outbox_event_name
    ON integration_outbox(event_name);

-- 复合索引：状态 + 重试时间（Worker claim 查询优化）
CREATE INDEX IF NOT EXISTS idx_integration_outbox_status_retry
    ON integration_outbox(status, next_retry_at)
    WHERE status IN ('pending', 'failed', 'queued');

-- 发生时间索引（按时间顺序处理）
CREATE INDEX IF NOT EXISTS idx_integration_outbox_occurred_at
    ON integration_outbox(occurred_at);

-- ============================================================================
-- 注释
-- ============================================================================

COMMENT ON TABLE integration_outbox IS '集成事件 Outbox 表 - Transactional Outbox 模式实现';
COMMENT ON COLUMN integration_outbox.event_id IS '全局唯一事件 ID';
COMMENT ON COLUMN integration_outbox.tenant_id IS '租户 ID（必填）';
COMMENT ON COLUMN integration_outbox.event_name IS '事件名称（稳定契约）';
COMMENT ON COLUMN integration_outbox.event_version IS '事件版本';
COMMENT ON COLUMN integration_outbox.partition_key IS '分区键（建议使用 tenantId）';
COMMENT ON COLUMN integration_outbox.payload IS '事件负载（JSON 格式）';
COMMENT ON COLUMN integration_outbox.status IS '状态：pending, queued, processing, published, failed, dead';
COMMENT ON COLUMN integration_outbox.retry_count IS '重试次数';
COMMENT ON COLUMN integration_outbox.next_retry_at IS '下次重试时间';
COMMENT ON COLUMN integration_outbox.last_error IS '最后错误信息';
COMMENT ON COLUMN integration_outbox.occurred_at IS '事件发生时间（业务时间）';
