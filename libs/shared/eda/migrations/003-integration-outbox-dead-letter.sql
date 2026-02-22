-- ============================================================================
-- 集成事件 Outbox 死信表
--
-- 用途：存储超过最大重试次数的失败事件
--
-- 设计说明：
-- - 从 integration_outbox 迁移失败超过最大重试次数的事件
-- - 保留完整的事件信息用于后续人工处理或重新投递
--
-- @module @oksai/eda
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_outbox_dead_letter (
    -- 主键
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 租户标识
    tenant_id       VARCHAR(36) NOT NULL,

    -- 事件标识
    event_id        VARCHAR(36) NOT NULL,

    -- 事件元数据
    event_name      VARCHAR(255) NOT NULL,
    event_version   INTEGER NOT NULL,
    partition_key   VARCHAR(255) NOT NULL,

    -- 事件负载
    payload         JSONB NOT NULL,

    -- 失败信息
    retry_count     INTEGER NOT NULL,
    last_error      TEXT,

    -- 处理者信息
    processor_name  VARCHAR(255),
    consumer_name   VARCHAR(255),

    -- 时间戳
    occurred_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    dead_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 约束
-- ============================================================================

-- 唯一约束：同一事件只能有一条死信记录
ALTER TABLE integration_outbox_dead_letter
    ADD CONSTRAINT uq_integration_outbox_dead_letter_event_id
    UNIQUE (event_id);

-- ============================================================================
-- 索引
-- ============================================================================

-- 事件 ID 索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_outbox_dead_letter_event_id
    ON integration_outbox_dead_letter(event_id);

-- 租户 ID 索引
CREATE INDEX IF NOT EXISTS idx_integration_outbox_dead_letter_tenant_id
    ON integration_outbox_dead_letter(tenant_id);

-- 事件名称索引
CREATE INDEX IF NOT EXISTS idx_integration_outbox_dead_letter_event_name
    ON integration_outbox_dead_letter(event_name);

-- 死亡时间索引
CREATE INDEX IF NOT EXISTS idx_integration_outbox_dead_letter_dead_at
    ON integration_outbox_dead_letter(dead_at);

-- 处理者索引
CREATE INDEX IF NOT EXISTS idx_integration_outbox_dead_letter_processor
    ON integration_outbox_dead_letter(processor_name);

-- ============================================================================
-- 注释
-- ============================================================================

COMMENT ON TABLE integration_outbox_dead_letter IS '集成事件 Outbox 死信表 - 存储超过最大重试次数的失败事件';
COMMENT ON COLUMN integration_outbox_dead_letter.event_id IS '事件 ID';
COMMENT ON COLUMN integration_outbox_dead_letter.tenant_id IS '租户 ID';
COMMENT ON COLUMN integration_outbox_dead_letter.event_name IS '事件名称';
COMMENT ON COLUMN integration_outbox_dead_letter.event_version IS '事件版本';
COMMENT ON COLUMN integration_outbox_dead_letter.partition_key IS '分区键';
COMMENT ON COLUMN integration_outbox_dead_letter.payload IS '事件负载';
COMMENT ON COLUMN integration_outbox_dead_letter.retry_count IS '重试次数';
COMMENT ON COLUMN integration_outbox_dead_letter.last_error IS '最后错误信息';
COMMENT ON COLUMN integration_outbox_dead_letter.processor_name IS '处理器名称';
COMMENT ON COLUMN integration_outbox_dead_letter.consumer_name IS '消费者名称';
COMMENT ON COLUMN integration_outbox_dead_letter.occurred_at IS '事件发生时间';
COMMENT ON COLUMN integration_outbox_dead_letter.dead_at IS '进入死信时间';
