Feature: 租户成员管理
  As a 系统管理员
  I want 将用户添加到租户
  So that 用户可以访问租户资源

  Background:
    Given 已存在一个用户 "user-001" 邮箱为 "member@example.com"
    And 已存在一个租户 "tenant-001"

  Scenario: 成功添加用户到租户
    When 将用户添加到租户 "tenant-001"
    Then 用户属于租户 "tenant-001"
    And 触发 "UserAddedToTenant" 事件

  Scenario: 重复添加到同一租户幂等
    Given 用户 "user-001" 已属于租户 "tenant-001"
    When 再次将用户添加到租户 "tenant-001"
    Then 操作成功完成
    And 不产生新的事件

  Scenario: 用户可以属于多个租户
    Given 用户 "user-001" 已属于租户 "tenant-001"
    And 已存在一个租户 "tenant-002"
    When 将用户添加到租户 "tenant-002"
    Then 用户属于租户 "tenant-001"
    And 用户属于租户 "tenant-002"
