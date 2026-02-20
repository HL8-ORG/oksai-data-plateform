Feature: 用户注册
  As a 新用户
  I want 使用邮箱注册账户
  So that 我可以访问平台服务

  Background:
    Given 系统准备就绪

  Scenario: 成功注册新用户
    Given 一个有效的邮箱地址 "user@example.com"
    And 一个用户ID "user-123"
    When 注册新用户
    Then 用户创建成功
    And 用户状态应为 "active"
    And 用户邮箱应为 "user@example.com"
    And 触发 "UserRegistered" 事件

  Scenario: 邮箱自动转小写
    Given 一个邮箱地址 "USER@Example.COM"
    And 一个用户ID "user-456"
    When 注册新用户
    Then 用户邮箱应为 "user@example.com"

  Scenario Outline: 无效邮箱格式注册失败
    Given 一个无效的邮箱地址 "<email>"
    And 一个用户ID "<userId>"
    When 尝试注册新用户
    Then 注册失败
    And 错误信息应包含 "邮箱格式不正确"

    Examples:
      | email              | userId    |
      | invalid-email      | user-001  |
      | missing@domain     | user-002  |
      | @nodomain.com      | user-003  |
      | spaces in@test.com | user-004  |

  Scenario: 空邮箱注册失败
    Given 一个空的邮箱地址
    And 一个用户ID "user-005"
    When 尝试注册新用户
    Then 注册失败
    And 错误信息应包含 "邮箱不能为空"

  Scenario: 生成随机用户ID
    Given 一个有效的邮箱地址 "auto@example.com"
    When 系统自动生成用户ID并注册
    Then 用户创建成功
    And 用户ID应为有效的UUID格式
