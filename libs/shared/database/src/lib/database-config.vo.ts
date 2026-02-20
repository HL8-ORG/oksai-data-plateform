/**
 * 数据库配置
 *
 * 定义数据库连接所需的配置信息。
 *
 * @example
 * ```typescript
 * const config = DatabaseConfig.create({
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'mydb',
 *   username: 'user',
 *   password: 'pass'
 * });
 * ```
 */
export interface DatabaseConfigProps {
	/**
	 * 数据库主机地址
	 */
	host: string;

	/**
	 * 数据库端口
	 */
	port: number;

	/**
	 * 数据库名称
	 */
	database: string;

	/**
	 * 用户名
	 */
	username: string;

	/**
	 * 密码
	 */
	password: string;

	/**
	 * 最大连接数
	 */
	maxConnections: number;
}

export class DatabaseConfig implements DatabaseConfigProps {
	/**
	 * 数据库主机地址
	 */
	public readonly host: string;

	/**
	 * 数据库端口
	 */
	public readonly port: number;

	/**
	 * 数据库名称
	 */
	public readonly database: string;

	/**
	 * 用户名
	 */
	public readonly username: string;

	/**
	 * 密码
	 */
	public readonly password: string;

	/**
	 * 最大连接数
	 */
	public readonly maxConnections: number;

	private constructor(props: DatabaseConfigProps) {
		this.host = props.host;
		this.port = props.port;
		this.database = props.database;
		this.username = props.username;
		this.password = props.password;
		this.maxConnections = props.maxConnections;
	}

	/**
	 * 创建数据库配置
	 *
	 * @param props - 配置属性
	 * @returns 数据库配置实例
	 */
	public static create(props: {
		host: string;
		port?: number;
		database: string;
		username: string;
		password: string;
		maxConnections?: number;
	}): DatabaseConfig {
		return new DatabaseConfig({
			host: props.host,
			port: props.port ?? 5432,
			database: props.database,
			username: props.username,
			password: props.password,
			maxConnections: props.maxConnections ?? 20
		});
	}

	/**
	 * 生成连接字符串
	 *
	 * @returns PostgreSQL 连接字符串
	 */
	public toConnectionString(): string {
		return `postgresql://${this.username}:${this.password}@${this.host}:${this.port}/${this.database}`;
	}
}
