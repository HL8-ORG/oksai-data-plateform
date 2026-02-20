/**
 * 租户 ID 值对象
 *
 * 表示租户的唯一标识符。
 *
 * @example
 * ```typescript
 * const tenantId = TenantId.generate();
 * const specificId = TenantId.create('tenant-123');
 * ```
 */
import { ValueObject } from '@oksai/kernel';

interface TenantIdProps {
	value: string;
}

export class TenantId extends ValueObject<TenantIdProps> {
	/**
	 * 获取 ID 值
	 */
	get value(): string {
		return this.props.value;
	}

	/**
	 * 创建租户 ID
	 *
	 * @param id - ID 字符串
	 * @returns TenantId 实例
	 */
	public static create(id: string): TenantId {
		return new TenantId({ value: id });
	}

	/**
	 * 生成随机租户 ID
	 *
	 * @returns 新的随机 TenantId
	 */
	public static generate(): TenantId {
		const id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
		return new TenantId({ value: id });
	}

	/**
	 * 判断是否相等
	 *
	 * @param other - 另一个 TenantId
	 * @returns 如果值相等返回 true
	 */
	public equals(other: TenantId): boolean {
		return this.props.value === other.props.value;
	}
}
