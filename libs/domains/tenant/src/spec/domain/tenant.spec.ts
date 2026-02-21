/**
 * Tenant 领域模块单元测试
 *
 * 测试租户聚合根和值对象
 */
import { Tenant, TenantName, TenantPlan, TenantStatus } from '../../index';
import { UniqueEntityID } from '@oksai/kernel';

describe('Tenant Domain', () => {
	describe('TenantName', () => {
		describe('create', () => {
			it('应该创建租户名称', () => {
				// Act
				const result = TenantName.create('测试公司');

				// Assert
				expect(result.isOk()).toBe(true);
				if (result.isOk()) {
					expect(result.value.value).toBe('测试公司');
				}
			});

			it('空名称应该失败', () => {
				// Act
				const result = TenantName.create('');

				// Assert
				expect(result.isFail()).toBe(true);
			});

			it('名称过长应该失败', () => {
				// Arrange
				const longName = 'a'.repeat(101);

				// Act
				const result = TenantName.create(longName);

				// Assert
				expect(result.isFail()).toBe(true);
			});
		});
	});

	describe('TenantPlan', () => {
		describe('create', () => {
			it('应该创建有效的计划', () => {
				// Act
				const result = TenantPlan.create('basic');

				// Assert
				expect(result.isOk()).toBe(true);
				if (result.isOk()) {
					expect(result.value.value).toBe('basic');
				}
			});

			it('无效计划应该失败', () => {
				// Act
				const result = TenantPlan.create('invalid');

				// Assert
				expect(result.isFail()).toBe(true);
			});
		});

		describe('isUpgrade', () => {
			it('升级计划应该返回 true', () => {
				// Arrange
				const basicResult = TenantPlan.create('basic');
				const proResult = TenantPlan.create('pro');

				if (basicResult.isOk() && proResult.isOk()) {
					const basic = basicResult.value;
					const pro = proResult.value;

					// Act & Assert
					expect(basic.isUpgrade(pro)).toBe(true);
					expect(pro.isUpgrade(basic)).toBe(false);
				} else {
					fail('Failed to create plans');
				}
			});
		});
	});

	describe('TenantStatus', () => {
		describe('默认状态', () => {
			it('新租户应该是 pending 状态', () => {
				// Act
				const status = TenantStatus.pending();

				// Assert
				expect(status.value).toBe('pending');
			});
		});

		describe('activate', () => {
			it('应该激活租户', () => {
				// Arrange
				const status = TenantStatus.pending();

				// Act
				const newStatus = status.activate();

				// Assert
				expect(newStatus.value).toBe('active');
			});
		});

		describe('suspend', () => {
			it('应该暂停租户', () => {
				// Arrange
				const status = TenantStatus.active();

				// Act
				const newStatus = status.suspend();

				// Assert
				expect(newStatus.value).toBe('suspended');
			});
		});
	});

	describe('Tenant', () => {
		describe('create', () => {
			it('应该创建租户', () => {
				// Arrange
				const nameResult = TenantName.create('测试公司');
				const planResult = TenantPlan.create('basic');

				if (!nameResult.isOk() || !planResult.isOk()) {
					fail('Failed to create name or plan');
					return;
				}

				// Act
				const result = Tenant.create({
					name: nameResult.value,
					plan: planResult.value
				});

				// Assert
				expect(result.isOk()).toBe(true);
				if (result.isOk()) {
					const tenant = result.value;
					expect(tenant.id).toBeDefined();
					expect(tenant.name.value).toBe('测试公司');
					expect(tenant.plan.value).toBe('basic');
					expect(tenant.status.value).toBe('pending');
				}
			});

			it('创建租户应该触发 TenantCreatedEvent', () => {
				// Arrange
				const nameResult = TenantName.create('测试公司');
				const planResult = TenantPlan.create('basic');

				if (!nameResult.isOk() || !planResult.isOk()) {
					fail('Failed to create name or plan');
					return;
				}

				// Act
				const result = Tenant.create({
					name: nameResult.value,
					plan: planResult.value
				});

				// Assert
				if (result.isOk()) {
					expect(result.value.domainEvents).toHaveLength(1);
					const event = result.value.domainEvents[0];
					expect(event.eventName).toBe('TenantCreated');
				} else {
					fail('Failed to create tenant');
				}
			});

			it('应该使用指定的 ID 创建租户', () => {
				// Arrange
				const specifiedId = new UniqueEntityID('tenant-123');
				const nameResult = TenantName.create('测试公司');
				const planResult = TenantPlan.create('basic');

				if (!nameResult.isOk() || !planResult.isOk()) {
					fail('Failed to create name or plan');
					return;
				}

				// Act
				const result = Tenant.create(
					{
						name: nameResult.value,
						plan: planResult.value
					},
					specifiedId
				);

				// Assert
				expect(result.isOk()).toBe(true);
				if (result.isOk()) {
					expect(result.value.id.equals(specifiedId)).toBe(true);
				}
			});
		});

		describe('activate', () => {
			it('应该激活租户', () => {
				// Arrange
				const tenant = createTestTenant();

				// Act
				tenant.activate();

				// Assert
				expect(tenant.status.value).toBe('active');
			});

			it('激活租户应该触发 TenantActivatedEvent', () => {
				// Arrange
				const tenant = createTestTenant();
				tenant.clearDomainEvents();

				// Act
				tenant.activate();

				// Assert
				expect(tenant.domainEvents).toHaveLength(1);
				expect(tenant.domainEvents[0].eventName).toBe('TenantActivated');
			});

			it('非 pending 状态不应该能激活', () => {
				// Arrange
				const tenant = createTestTenant();
				tenant.activate();

				// Act & Assert
				expect(() => tenant.activate()).toThrow('只有待审核状态的租户才能激活');
			});
		});

		describe('suspend', () => {
			it('应该暂停租户', () => {
				// Arrange
				const tenant = createTestTenant();
				tenant.activate();

				// Act
				tenant.suspend('欠费');

				// Assert
				expect(tenant.status.value).toBe('suspended');
			});

			it('暂停租户应该触发 TenantSuspendedEvent', () => {
				// Arrange
				const tenant = createTestTenant();
				tenant.activate();
				tenant.clearDomainEvents();

				// Act
				tenant.suspend('欠费');

				// Assert
				expect(tenant.domainEvents).toHaveLength(1);
				expect(tenant.domainEvents[0].eventName).toBe('TenantSuspended');
			});

			it('非 active 状态不应该能暂停', () => {
				// Arrange
				const tenant = createTestTenant();

				// Act & Assert
				expect(() => tenant.suspend('欠费')).toThrow('只有活跃状态的租户才能暂停');
			});
		});

		describe('upgradePlan', () => {
			it('应该升级计划', () => {
				// Arrange
				const tenant = createTestTenant();
				tenant.activate();
				const newPlanResult = TenantPlan.create('pro');

				if (!newPlanResult.isOk()) {
					fail('Failed to create plan');
					return;
				}

				// Act
				tenant.upgradePlan(newPlanResult.value);

				// Assert
				expect(tenant.plan.value).toBe('pro');
			});

			it('降级计划应该失败', () => {
				// Arrange
				const tenant = createTestTenantWithPlan('pro');
				tenant.activate();
				const basicPlanResult = TenantPlan.create('basic');

				if (!basicPlanResult.isOk()) {
					fail('Failed to create plan');
					return;
				}

				// Act & Assert
				expect(() => tenant.upgradePlan(basicPlanResult.value)).toThrow('不能降级计划');
			});
		});
	});
});

// Helper functions
function createTestTenant(): Tenant {
	const nameResult = TenantName.create('测试公司');
	const planResult = TenantPlan.create('basic');

	if (!nameResult.isOk() || !planResult.isOk()) {
		throw new Error('Failed to create test tenant');
	}

	const result = Tenant.create({
		name: nameResult.value,
		plan: planResult.value
	});

	if (!result.isOk()) {
		throw new Error('Failed to create test tenant');
	}

	return result.value;
}

function createTestTenantWithPlan(planValue: string): Tenant {
	const nameResult = TenantName.create('测试公司');
	const planResult = TenantPlan.create(planValue);

	if (!nameResult.isOk() || !planResult.isOk()) {
		throw new Error('Failed to create test tenant');
	}

	const result = Tenant.create({
		name: nameResult.value,
		plan: planResult.value
	});

	if (!result.isOk()) {
		throw new Error('Failed to create test tenant');
	}

	return result.value;
}
