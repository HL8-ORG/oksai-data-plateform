/**
 * 租户状态值对象
 *
 * 表示租户的当前状态。
 * 支持的状态：pending, active, suspended, cancelled
 *
 * @example
 * ```typescript
 * const status = TenantStatus.pending();
 * const activeStatus = status.activate();
 * ```
 */
import { ValueObject } from '@oksai/kernel';

interface TenantStatusProps {
	value: string;
}

export class TenantStatus extends ValueObject<TenantStatusProps> {
	private static readonly PENDING = 'pending';
	private static readonly ACTIVE = 'active';
	private static readonly SUSPENDED = 'suspended';
	private static readonly CANCELLED = 'cancelled';

	/**
	 * 获取状态值
	 */
	get value(): string {
		return this.props.value;
	}

	private constructor(props: TenantStatusProps) {
		super(props);
	}

	/**
	 * 创建待审核状态
	 */
	public static pending(): TenantStatus {
		return new TenantStatus({ value: TenantStatus.PENDING });
	}

	/**
	 * 创建活跃状态
	 */
	public static active(): TenantStatus {
		return new TenantStatus({ value: TenantStatus.ACTIVE });
	}

	/**
	 * 创建暂停状态
	 */
	public static suspended(): TenantStatus {
		return new TenantStatus({ value: TenantStatus.SUSPENDED });
	}

	/**
	 * 创建取消状态
	 */
	public static cancelled(): TenantStatus {
		return new TenantStatus({ value: TenantStatus.CANCELLED });
	}

	/**
	 * 判断是否是待审核状态
	 */
	public isPending(): boolean {
		return this.props.value === TenantStatus.PENDING;
	}

	/**
	 * 判断是否是活跃状态
	 */
	public isActive(): boolean {
		return this.props.value === TenantStatus.ACTIVE;
	}

	/**
	 * 判断是否是暂停状态
	 */
	public isSuspended(): boolean {
		return this.props.value === TenantStatus.SUSPENDED;
	}

	/**
	 * 激活租户
	 *
	 * @returns 新的活跃状态
	 * @throws Error 如果当前状态不允许激活
	 */
	public activate(): TenantStatus {
		if (!this.isPending()) {
			throw new Error('只有待审核状态的租户才能激活');
		}
		return TenantStatus.active();
	}

	/**
	 * 暂停租户
	 *
	 * @returns 新的暂停状态
	 * @throws Error 如果当前状态不允许暂停
	 */
	public suspend(): TenantStatus {
		if (!this.isActive()) {
			throw new Error('只有活跃状态的租户才能暂停');
		}
		return TenantStatus.suspended();
	}

	/**
	 * 取消租户
	 *
	 * @returns 新的取消状态
	 */
	public cancel(): TenantStatus {
		return TenantStatus.cancelled();
	}
}
