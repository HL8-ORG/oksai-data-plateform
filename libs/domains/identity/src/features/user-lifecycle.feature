Feature: 用户生命周期管理
  As a 系统管理员
  I want 禁用或启用用户
  So that 控制用户对平台的访问

  Background:
    Given 已存在一个活跃用户 "user-001" 邮箱为 "active@example.com"

  Scenario: 成功禁用用户
    Given 用户 "user-001" 处于活跃状态
    When 禁用用户并填写原因为 "违规操作"
    Then 用户状态变为 "disabled"
    And 禁用原因为 "违规操作"
    And 触发 "UserDisabled" 事件

  Scenario: 成功启用已禁用用户
    Given 用户 "user-001" 已被禁用，原因为 "测试"
    When 启用用户
    Then 用户状态变为 "active"
    And 禁用原因为空
    And 触发 "UserEnabled" 事件

  Scenario: 禁用操作幂等
    Given 用户 "user-001" 已被禁用，原因为 "测试"
    When 再次禁用用户
    Then 操作成功完成
    And 不产生新的事件

  Scenario: 启用操作幂等
    Given 用户 "user-001" 处于活跃状态
    When 启用用户
    Then 操作成功完成
    And 不产生新的事件

  Scenario: 租户所有者不能被禁用
    Given 用户 "user-001" 是租户 "tenant-001" 的所有者
    When 尝试禁用用户
    Then 禁用失败
    And 错误信息应包含 "租户所有者不能被禁用"
