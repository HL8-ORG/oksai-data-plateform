/**
 * 租户聚合根
 *
 * 表示一个租户，是多租户系统的核心实体。
 *
 * 业务规则：
 * - 新创建的租户处于"待审核"（pending）状态
 * - 只有待审核状态的租户才能被激活
 * - 只有活跃状态的租户才能被暂停
 * - 计划只能升级，不能降级
 *
 * @example
 * ```typescript
 * const result = Tenant.create({
 *   id: TenantId.generate(),
 *   name: TenantName.create('测试公司'),
 *   plan: TenantPlan.create('basic')
 * });
 *
 * if (result.isOk()) {
 *   const tenant = result.value;
 *   tenant.activate();
 * }
 * ```
 */
import { AggregateRoot, Result, UniqueEntityID } from '@oksai/kernel';
import { TenantName } from './tenant-name.vo';
import { TenantPlan } from './tenant-plan.vo';
import { TenantStatus } from './tenant-status.vo';
import { TenantCreatedEvent } from '../events/tenant-created.domain-event';
import { TenantActivatedEvent } from '../events/tenant-activated.domain-event';
import { TenantSuspendedEvent } from '../events/tenant-suspended.domain-event';

interface TenantProps {
	name: TenantName;
	plan: TenantPlan;
	status: TenantStatus;
}

export class Tenant extends AggregateRoot<TenantProps> {
	/**
	 * 获取租户名称
	 */
	get name(): TenantName {
		return this.props.name;
	}

	/**
	 * 获取租户计划
	 */
	get plan(): TenantPlan {
		return this.props.plan;
	}

	/**
	 * 获取租户状态
	 */
	get status(): TenantStatus {
		return this.props.status;
	}

	private constructor(props: TenantProps, id?: UniqueEntityID) {
		super(props, id);
	}

	/**
	 * 创建租户
	 *
	 * @param props - 创建参数
	 * @returns Result 包含 Tenant 或错误
	 */
	public static create(props: { name: TenantName; plan: TenantPlan }, id?: UniqueEntityID): Result<Tenant, Error> {
		const tenantId = id ?? new UniqueEntityID();
		const tenant = new Tenant({
			name: props.name,
			plan: props.plan,
			status: TenantStatus.pending()
		}, tenantId);

		// 添加领域事件
		tenant.addDomainEvent(
			new TenantCreatedEvent(tenantId, {
				tenantId: String(tenantId.value),
				name: props.name.value,
				plan: props.plan.value,
				status: 'pending'
			})
		);

		return Result.ok(tenant);
	}

	/**
	 * 从持久化重建租户
	 *
	 * @param props - 完整属性
	 * @returns Tenant 实例
	 */
	public static reconstitute(props: {
		name: TenantName;
		plan: TenantPlan;
		status: TenantStatus;
	}, id: UniqueEntityID): Tenant {
		return new Tenant(props, id);
	}

	/**
	 * 激活租户
	 *
	 * @throws Error 如果当前状态不允许激活
	 */
	public activate(): void {
		this.props.status = this.props.status.activate();

		this.addDomainEvent(
			new TenantActivatedEvent(this.id, {
				tenantId: String(this.id.value),
				activatedAt: new Date().toISOString()
			})
		);
	}

	/**
	 * 暂停租户
	 *
	 * @param reason - 暂停原因
	 * @throws Error 如果当前状态不允许暂停
	 */
	public suspend(reason: string): void {
		this.props.status = this.props.status.suspend();

		this.addDomainEvent(
			new TenantSuspendedEvent(this.id, {
				tenantId: String(this.id.value),
				reason,
				suspendedAt: new Date().toISOString()
			})
		);
	}

	/**
	 * 升级计划
	 *
	 * @param newPlan - 新计划
	 * @throws Error 如果尝试降级
	 */
	public upgradePlan(newPlan: TenantPlan): void {
		if (this.props.plan.isDowngrade(newPlan)) {
			throw new Error('不能降级计划');
		}

		this.props.plan = newPlan;
	}
}
