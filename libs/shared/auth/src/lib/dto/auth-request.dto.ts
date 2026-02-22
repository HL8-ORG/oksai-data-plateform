import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * 登录请求 DTO
 */
export class SignInRequestDto {
	/**
	 * 用户邮箱
	 */
	@IsEmail({}, { message: '邮箱格式无效' })
	@IsNotEmpty({ message: '邮箱不能为空' })
	email!: string;

	/**
	 * 用户密码
	 */
	@IsString({ message: '密码必须是字符串' })
	@IsNotEmpty({ message: '密码不能为空' })
	password!: string;

	/**
	 * 是否记住登录
	 */
	@IsOptional()
	rememberMe?: boolean;
}

/**
 * 注册请求 DTO
 */
export class SignUpRequestDto {
	/**
	 * 用户邮箱
	 */
	@IsEmail({}, { message: '邮箱格式无效' })
	@IsNotEmpty({ message: '邮箱不能为空' })
	email!: string;

	/**
	 * 用户密码
	 */
	@IsString({ message: '密码必须是字符串' })
	@IsNotEmpty({ message: '密码不能为空' })
	@MinLength(8, { message: '密码长度至少为 8 个字符' })
	password!: string;

	/**
	 * 用户名
	 */
	@IsString({ message: '用户名必须是字符串' })
	@IsNotEmpty({ message: '用户名不能为空' })
	name!: string;

	/**
	 * 回调 URL（用于邮箱验证）
	 */
	@IsOptional()
	@IsString({ message: '回调 URL 必须是字符串' })
	callbackURL?: string;
}

/**
 * 密码重置请求 DTO
 */
export class ForgotPasswordRequestDto {
	/**
	 * 用户邮箱
	 */
	@IsEmail({}, { message: '邮箱格式无效' })
	@IsNotEmpty({ message: '邮箱不能为空' })
	email!: string;

	/**
	 * 回调 URL
	 */
	@IsOptional()
	@IsString({ message: '回调 URL 必须是字符串' })
	callbackURL?: string;
}

/**
 * 重置密码请求 DTO
 */
export class ResetPasswordRequestDto {
	/**
	 * 重置令牌
	 */
	@IsString({ message: '令牌必须是字符串' })
	@IsNotEmpty({ message: '令牌不能为空' })
	token!: string;

	/**
	 * 新密码
	 */
	@IsString({ message: '密码必须是字符串' })
	@IsNotEmpty({ message: '密码不能为空' })
	@MinLength(8, { message: '密码长度至少为 8 个字符' })
	newPassword!: string;
}

/**
 * 验证邮箱请求 DTO
 */
export class VerifyEmailRequestDto {
	/**
	 * 验证令牌
	 */
	@IsString({ message: '令牌必须是字符串' })
	@IsNotEmpty({ message: '令牌不能为空' })
	token!: string;
}

/**
 * 刷新令牌请求 DTO
 */
export class RefreshTokenRequestDto {
	/**
	 * 刷新令牌
	 */
	@IsString({ message: '刷新令牌必须是字符串' })
	@IsNotEmpty({ message: '刷新令牌不能为空' })
	refreshToken!: string;
}
