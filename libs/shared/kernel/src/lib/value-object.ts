/**
 * 值对象基类
 *
 * 值对象是通过其属性值来定义的对象，而不是通过标识符。
 * 值对象具有以下特点：
 * - 不可变性：创建后不能修改
 * - 相等性：通过属性值比较，而不是标识符
 * - 无副作用：所有操作返回新实例
 *
 * @template T - 值对象属性类型
 *
 * @example
 * ```typescript
 * interface NameProps {
 *   firstName: string;
 *   lastName: string;
 * }
 *
 * class PersonName extends ValueObject<NameProps> {
 *   get firstName(): string {
 *     return this.props.firstName;
 *   }
 *
 *   get lastName(): string {
 *     return this.props.lastName;
 *   }
 * }
 *
 * const name1 = new PersonName({ firstName: '张', lastName: '三' });
 * const name2 = new PersonName({ firstName: '张', lastName: '三' });
 * console.log(name1.equals(name2)); // true
 * ```
 */
export abstract class ValueObject<T> {
	/**
	 * 值对象属性
	 * @protected
	 */
	protected readonly props: T;

	/**
	 * 构造函数
	 *
	 * @param props - 值对象属性
	 */
	constructor(props: T) {
		this.props = Object.freeze({ ...props });
	}

	/**
	 * 判断是否与另一个值对象相等
	 *
	 * 通过比较两个值对象的所有属性值来判断相等性。
	 *
	 * @param vo - 要比较的值对象
	 * @returns 如果属性值相等返回 true，否则返回 false
	 */
	public equals(vo?: ValueObject<T> | null): boolean {
		if (!vo) {
			return false;
		}

		if (vo.constructor !== this.constructor) {
			return false;
		}

		return JSON.stringify(this.props) === JSON.stringify(vo.props);
	}

	/**
	 * 获取属性值的浅拷贝
	 *
	 * @returns 属性对象的浅拷贝
	 */
	public getProps(): T {
		return { ...this.props };
	}

	/**
	 * 克隆值对象
	 *
	 * @returns 新的值对象实例
	 */
	public clone(): this {
		const constructor = this.constructor as new (props: T) => this;
		return new constructor(this.getProps());
	}
}
