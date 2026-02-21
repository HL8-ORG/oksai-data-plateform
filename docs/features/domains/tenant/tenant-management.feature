Feature: 租户管理
  As a 系统管理员
  I want 创建和管理租户
  So that 为客户提供独立的租户空间

  Background:
    Given 系统准备就绪

  Scenario: 成功创建租户
    Given 一个有效的租户名称 "测试公司"
      And 一个租户ID "tenant-001"
    When 创建新租户
    Then 租户创建成功
      And 租户名称为 "测试公司"
      And 租户状态为 "active"
      And 租户计划为 "free"
      And 触发 "TenantCreated" 事件

  Scenario: 租户名称长度验证
    Given 一个租户名称 "<name>"
    When 尝试创建租户
    Then <result>

    Examples:
      | name       | result           |
      | A          | 创建失败         |
      | 测试公司   | 创建成功         |

  Scenario: 空名称创建失败
    Given 一个空的租户名称
    When 尝试创建租户
    Then 创建失败
      And 错误信息应包含 "租户名称不能为空"

Feature: 租户状态管理
  As a 系统管理员
  I want 暂停或恢复租户
  So that 控制租户对平台的访问

  Background:
    Given 已存在一个活跃租户 "tenant-001" 名称为 "测试公司"

  Scenario: 成功暂停租户
    Given 租户 "tenant-001" 处于活跃状态
    When 暂停租户并填写原因为 "欠费"
    Then 租户状态变为 "suspended"
      And 暂停原因为 "欠费"
      And 触发 "TenantSuspended" 事件

  Scenario: 成功恢复租户
    Given 租户 "tenant-001" 已被暂停，原因为 "欠费"
    When 恢复租户
    Then 租户状态变为 "active"
      And 暂停原因为空
      And 触发 "TenantActivated" 事件

  Scenario: 暂停操作幂等
    Given 租户 "tenant-001" 已被暂停，原因为 "测试"
    When 再次暂停租户
    Then 操作成功完成
      And 不产生新的事件

  Scenario: 恢复操作幂等
    Given 租户 "tenant-001" 处于活跃状态
    When 恢复租户
    Then 操作成功完成
      And 不产生新的事件

Feature: 租户计划管理
  As a 租户管理员
  I want 升级或降级租户计划
  So that 获得适合业务规模的资源配额

  Background:
    Given 已存在一个活跃租户 "tenant-001" 使用 "free" 计划

  Scenario: 升级计划
    Given 租户 "tenant-001" 使用 "free" 计划
    When 升级到 "pro" 计划
    Then 租户计划立即变为 "pro"
      And 触发 "TenantPlanChanged" 事件

  Scenario: 降级计划
    Given 租户 "tenant-001" 使用 "pro" 计划
    When 降级到 "free" 计划
    Then 记录降级请求
      And 计划在当前周期结束后变更

  Scenario: 已暂停租户不能变更计划
    Given 租户 "tenant-001" 已被暂停
    When 尝试升级计划
    Then 变更失败
      And 错误信息应包含 "租户已暂停"
