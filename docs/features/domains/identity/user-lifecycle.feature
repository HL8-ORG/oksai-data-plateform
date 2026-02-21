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

Feature: 角色管理
  As a 租户管理员
  I want 为用户授予或撤销角色
  So that 用户获得相应权限

  Background:
    Given 已存在一个活跃用户 "user-001" 邮箱为 "role-test@example.com"

  Scenario: 成功授予角色
    Given 用户 "user-001" 拥有角色 "TenantMember"
    When 授予角色 "TenantAdmin"
    Then 用户拥有角色 "TenantAdmin"
    And 触发 "RoleGrantedToUser" 事件

  Scenario: 不能重复授予相同角色
    Given 用户 "user-001" 拥有角色 "TenantMember"
    When 尝试再次授予角色 "TenantMember"
    Then 授予失败
    And 错误信息应包含 "用户已拥有该角色"

  Scenario: 禁用用户不能接受角色授予
    Given 用户 "user-001" 已被禁用
    When 尝试授予角色 "TenantAdmin"
    Then 授予失败
    And 错误信息应包含 "用户已禁用"

  Scenario: 成功撤销角色
    Given 用户 "user-001" 拥有角色 "TenantMember" 和 "TenantAdmin"
    When 撤销角色 "TenantAdmin"
    Then 用户不再拥有角色 "TenantAdmin"
    And 用户仍拥有角色 "TenantMember"

  Scenario: 不能撤销最后一个角色
    Given 用户 "user-001" 仅拥有角色 "TenantMember"
    When 尝试撤销角色 "TenantMember"
    Then 撤销失败
    And 错误信息应包含 "不能移除最后一个角色"

  Scenario: 无效角色键格式
    When 尝试授予角色 "invalid_role"
    Then 授予失败
    And 错误信息应包含 "角色键格式不正确"

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
