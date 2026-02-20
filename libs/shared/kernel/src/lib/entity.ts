/**
 * 实体基类
 *
 * 实体是通过其唯一标识符来定义的对象，而不是通过属性。
 * 实体具有以下特点：
 * - 唯一标识符：通过 ID 区分
 * - 可变性：属性可以随时间变化
 * - 相等性：通过标识符比较，而不是属性
 *
 * @template T - 实体属性类型
 *
 * @example
 * ```typescript
 * interface UserProps {
 *   name: string;
 *   email: string;
 * }
 *
 * class User extends Entity<UserProps> {
 *   get name(): string {
 *     return this.props.name;
 *   }
 *
 *   private constructor(props: UserProps, id?: UniqueEntityID) {
 *     super(props, id);
 *   }
 *
 *   static create(props: UserProps, id?: UniqueEntityID): User {
 *     return new User(props, id);
 *   }
 * }
 * ```
 */
import { UniqueEntityID } from './unique-entity-id';

export abstract class Entity<T> {
	/**
	 * 实体唯一标识符
	 * @protected
	 */
	protected readonly _id: UniqueEntityID;

	/**
	 * 实体属性
	 * @protected
	 */
	protected props: T;

	/**
	 * 构造函数
	 *
	 * @param props - 实体属性
	 * @param id - 可选的唯一标识符，不传则自动生成
	 */
	constructor(props: T, id?: UniqueEntityID) {
		this._id = id ?? new UniqueEntityID();
		this.props = props;
	}

	/**
	 * 获取实体唯一标识符
	 *
	 * @returns 唯一标识符
	 */
	public get id(): UniqueEntityID {
		return this._id;
	}

	/**
	 * 判断是否与另一个实体相等
	 *
	 * 通过比较两个实体的唯一标识符来判断相等性。
	 *
	 * @param entity - 要比较的实体
	 * @returns 如果标识符相等返回 true，否则返回 false
	 */
	public equals(entity?: Entity<T> | null): boolean {
		if (!entity) {
			return false;
		}

		if (entity.constructor !== this.constructor) {
			return false;
		}

		return this._id.equals(entity._id);
	}

	/**
	 * 获取属性值的拷贝
	 *
	 * @returns 属性对象的拷贝
	 */
	public getProps(): T & { id: UniqueEntityID } {
		return {
			...this.props,
			id: this._id
		};
	}

	/**
	 * 获取原始属性对象（不包含 id）
	 *
	 * @returns 原始属性对象
	 */
	public getOriginalProps(): T {
		return this.props;
	}
}
