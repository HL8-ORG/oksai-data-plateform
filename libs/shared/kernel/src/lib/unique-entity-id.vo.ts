/**
 * 唯一实体标识符
 *
 * 用于标识实体和聚合根的唯一性。
 * 支持自动生成 UUID 或使用自定义值。
 *
 * @example
 * ```typescript
 * // 自动生成 UUID
 * const id1 = new UniqueEntityID();
 *
 * // 使用自定义值
 * const id2 = new UniqueEntityID('user-123');
 *
 * // 使用数字 ID
 * const id3 = new UniqueEntityID(12345);
 * ```
 */
export class UniqueEntityID {
	/**
	 * 标识符值
	 * @private
	 */
	private readonly _value: string | number;

	/**
	 * 构造函数
	 *
	 * @param value - 可选的自定义标识符值，不传则自动生成 UUID
	 */
	constructor(value?: string | number) {
		this._value = value ?? this.generateUUID();
	}

	/**
	 * 获取标识符值
	 *
	 * @returns 标识符值
	 */
	public get value(): string | number {
		return this._value;
	}

	/**
	 * 判断是否与另一个 ID 相等
	 *
	 * @param id - 要比较的 ID
	 * @returns 如果值相等返回 true，否则返回 false
	 */
	public equals(id?: UniqueEntityID | null): boolean {
		if (!id) {
			return false;
		}
		return this._value === id._value;
	}

	/**
	 * 转换为字符串
	 *
	 * @returns 字符串形式的标识符
	 */
	public toString(): string {
		return String(this._value);
	}

	/**
	 * 获取原始值
	 *
	 * @returns 原始标识符值（string 或 number）
	 */
	public toValue(): string | number {
		return this._value;
	}

	/**
	 * 生成 UUID v4
	 *
	 * @returns UUID 字符串
	 * @private
	 */
	private generateUUID(): string {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}
}
