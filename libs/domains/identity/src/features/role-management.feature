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
