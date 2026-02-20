/**
 * 租户名称值对象
 *
 * 表示租户的名称。
 *
 * @example
 * ```typescript
 * const result = TenantName.create('测试公司');
 * if (result.isOk()) {
 *   console.log(result.value.value);
 * }
 * ```
 */
import { ValueObject, Result } from '@oksai/kernel';

interface TenantNameProps {
	value: string;
}

export class TenantName extends ValueObject<TenantNameProps> {
	private static readonly MAX_LENGTH = 100;

	/**
	 * 获取名称值
	 */
	get value(): string {
		return this.props.value;
	}

	private constructor(props: TenantNameProps) {
		super(props);
	}

	/**
	 * 创建租户名称
	 *
	 * @param name - 名称字符串
	 * @returns Result 包含 TenantName 或错误
	 */
	public static create(name: string): Result<TenantName, Error> {
		if (!name || name.trim().length === 0) {
			return Result.fail(new Error('租户名称不能为空'));
		}

		if (name.length > TenantName.MAX_LENGTH) {
			return Result.fail(new Error(`租户名称长度不能超过 ${TenantName.MAX_LENGTH} 个字符`));
		}

		return Result.ok(new TenantName({ value: name.trim() }));
	}
}
