-- ============================================================================
-- 集成事件 Inbox 已处理表
--
-- 用途：记录已处理的集成事件，实现幂等消费
--
-- 设计说明：
-- - 每个 consumer_name + event_id 组合只能处理一次
-- - 支持同一事件被多个消费者分别处理
--
-- @module @oksai/eda
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_inbox_processed (
    -- 主键
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 租户标识
    tenant_id       VARCHAR(36) NOT NULL,

    -- 事件标识
    event_id        VARCHAR(36) NOT NULL,

    -- 消费者标识（用于区分不同消费者）
    consumer_name   VARCHAR(255) NOT NULL,

    -- 处理时间
    processed_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 约束
-- ============================================================================

-- 唯一约束：同一消费者不能重复处理同一事件
ALTER TABLE integration_inbox_processed
    ADD CONSTRAINT uq_integration_inbox_event_consumer
    UNIQUE (event_id, consumer_name);

-- ============================================================================
-- 索引
-- ============================================================================

-- 租户 ID 索引
CREATE INDEX IF NOT EXISTS idx_integration_inbox_tenant_id
    ON integration_inbox_processed(tenant_id);

-- 消费者索引（按消费者查询）
CREATE INDEX IF NOT EXISTS idx_integration_inbox_consumer
    ON integration_inbox_processed(consumer_name);

-- 处理时间索引（按时间查询）
CREATE INDEX IF NOT EXISTS idx_integration_inbox_processed_at
    ON integration_inbox_processed(processed_at);

-- ============================================================================
-- 注释
-- ============================================================================

COMMENT ON TABLE integration_inbox_processed IS '集成事件 Inbox 已处理表 - 幂等消费实现';
COMMENT ON COLUMN integration_inbox_processed.tenant_id IS '租户 ID';
COMMENT ON COLUMN integration_inbox_processed.event_id IS '事件 ID';
COMMENT ON COLUMN integration_inbox_processed.consumer_name IS '消费者名称（用于去重维度）';
COMMENT ON COLUMN integration_inbox_processed.processed_at IS '处理时间';
