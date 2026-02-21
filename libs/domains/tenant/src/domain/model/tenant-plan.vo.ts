/**
 * 租户计划值对象
 *
 * 表示租户的订阅计划。
 * 支持的计划：free, basic, pro, enterprise
 *
 * @example
 * ```typescript
 * const result = TenantPlan.create('pro');
 * if (result.isOk()) {
 *   console.log(result.value.value); // 'pro'
 * }
 * ```
 */
import { ValueObject, Result } from '@oksai/kernel';

interface TenantPlanProps {
	value: string;
}

export class TenantPlan extends ValueObject<TenantPlanProps> {
	private static readonly VALID_PLANS = ['free', 'basic', 'pro', 'enterprise'];
	private static readonly PLAN_RANKS: Record<string, number> = {
		free: 0,
		basic: 1,
		pro: 2,
		enterprise: 3
	};

	/**
	 * 获取计划值
	 */
	get value(): string {
		return this.props.value;
	}

	private constructor(props: TenantPlanProps) {
		super(props);
	}

	/**
	 * 创建租户计划
	 *
	 * @param plan - 计划名称
	 * @returns Result 包含 TenantPlan 或错误
	 */
	public static create(plan: string): Result<TenantPlan, Error> {
		if (!TenantPlan.VALID_PLANS.includes(plan)) {
			return Result.fail(new Error(`无效的租户计划: ${plan}。有效计划: ${TenantPlan.VALID_PLANS.join(', ')}`));
		}

		return Result.ok(new TenantPlan({ value: plan }));
	}

	/**
	 * 判断是否是升级
	 *
	 * @param newPlan - 新计划
	 * @returns 如果是升级返回 true
	 */
	public isUpgrade(newPlan: TenantPlan): boolean {
		const currentRank = TenantPlan.PLAN_RANKS[this.props.value] ?? 0;
		const newRank = TenantPlan.PLAN_RANKS[newPlan.value] ?? 0;
		return newRank > currentRank;
	}

	/**
	 * 判断是否是降级
	 *
	 * @param newPlan - 新计划
	 * @returns 如果是降级返回 true
	 */
	public isDowngrade(newPlan: TenantPlan): boolean {
		const currentRank = TenantPlan.PLAN_RANKS[this.props.value] ?? 0;
		const newRank = TenantPlan.PLAN_RANKS[newPlan.value] ?? 0;
		return newRank < currentRank;
	}
}
