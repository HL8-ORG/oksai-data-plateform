import { Body, Controller, Get, Headers, HttpException, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import type { BetterAuthResult } from './adapters/secondary/better-auth/better-auth.types.js';
import { BetterAuthAdapter } from './adapters/secondary/better-auth/index.js';
import {
	SignInHandler,
	SignUpHandler,
	SignOutHandler,
	GetCurrentUserHandler,
	GetSessionHandler
} from './application/handlers/index.js';
import { SignInCommand, SignUpCommand, SignOutCommand, GetCurrentUserQuery, GetSessionQuery } from '@oksai/identity';
import {
	SignInRequestDto,
	SignUpRequestDto,
	ForgotPasswordRequestDto,
	ResetPasswordRequestDto,
	VerifyEmailRequestDto,
	RefreshTokenRequestDto,
	AuthResponseDto,
	SignUpResponseDto,
	SignOutResponseDto,
	UserInfoResponseDto,
	SessionResponseDto
} from './dto/index.js';

/**
 * 认证控制器
 *
 * 提供用户认证相关的 REST API 端点。
 * 通过应用层 Handlers 处理请求，遵循六边形架构。
 *
 * @example
 * ```typescript
 * // 登录
 * POST /v1/auth/sign-in
 * { "email": "user@example.com", "password": "password123" }
 *
 * // 注册
 * POST /v1/auth/sign-up
 * { "email": "user@example.com", "password": "password123", "name": "John Doe" }
 *
 * // 登出
 * POST /v1/auth/sign-out
 * Authorization: Bearer <token>
 *
 * // 获取当前用户
 * GET /v1/auth/me
 * Authorization: Bearer <token>
 * ```
 */
@Controller('v1/auth')
export class AuthController {
	constructor(
		private readonly signInHandler: SignInHandler,
		private readonly signUpHandler: SignUpHandler,
		private readonly signOutHandler: SignOutHandler,
		private readonly getCurrentUserHandler: GetCurrentUserHandler,
		private readonly getSessionHandler: GetSessionHandler,
		private readonly authAdapter: BetterAuthAdapter,
		private readonly eventEmitter: EventEmitter2
	) {}

	/**
	 * 用户登录
	 *
	 * @param dto - 登录请求
	 * @returns 认证结果
	 */
	@Post('sign-in')
	async signIn(@Body() dto: SignInRequestDto): Promise<AuthResponseDto> {
		try {
			const command = new SignInCommand({
				email: dto.email,
				password: dto.password
			});

			const result = await this.signInHandler.handle(command);

			// 发送认证成功事件
			await this.eventEmitter.emitAsync('auth.success', {
				user: { id: result.userId, email: result.email, name: result.name },
				session: { id: '', userId: result.userId, token: result.token, expiresAt: result.expiresAt }
			} as BetterAuthResult);

			const response = new AuthResponseDto();
			response.userId = result.userId;
			response.email = result.email;
			response.name = result.name;
			response.token = result.token;
			response.refreshToken = result.refreshToken;
			response.expiresAt = result.expiresAt;
			response.organization = result.organization;
			response.role = result.role;

			return response;
		} catch (error) {
			throw new HttpException((error as Error).message || '登录失败', HttpStatus.UNAUTHORIZED);
		}
	}

	/**
	 * 用户注册
	 *
	 * @param dto - 注册请求
	 * @returns 注册结果
	 */
	@Post('sign-up')
	async signUp(@Body() dto: SignUpRequestDto): Promise<SignUpResponseDto> {
		try {
			const command = new SignUpCommand({
				email: dto.email,
				password: dto.password,
				name: dto.name
			});

			const result = await this.signUpHandler.handle(command);

			// 发送认证成功事件
			await this.eventEmitter.emitAsync('auth.success', {
				user: { id: result.userId, email: result.email, name: result.name },
				session: {
					id: '',
					userId: result.userId,
					token: result.token || '',
					expiresAt: result.expiresAt || new Date()
				}
			} as BetterAuthResult);

			const response = new SignUpResponseDto();
			response.userId = result.userId;
			response.email = result.email;
			response.name = result.name;
			response.requireEmailVerification = result.requireEmailVerification;
			response.token = result.token;
			response.expiresAt = result.expiresAt;

			return response;
		} catch (error) {
			throw new HttpException((error as Error).message || '注册失败', HttpStatus.BAD_REQUEST);
		}
	}

	/**
	 * 用户登出
	 *
	 * @param authorization - Authorization 头
	 * @returns 登出结果
	 */
	@Post('sign-out')
	async signOut(@Headers('authorization') authorization?: string): Promise<SignOutResponseDto> {
		if (!authorization) {
			throw new UnauthorizedException('未提供认证令牌');
		}

		const token = this.extractToken(authorization);

		const command = new SignOutCommand({
			token,
			userId: '' // 将从 token 中解析
		});

		const result = await this.signOutHandler.handle(command);

		const response = new SignOutResponseDto();
		response.success = result.success;
		response.message = '已成功登出';
		response.signedOutSessionCount = result.signedOutSessionCount;

		return response;
	}

	/**
	 * 获取当前用户信息
	 *
	 * @param authorization - Authorization 头
	 * @returns 用户信息
	 */
	@Get('me')
	async getCurrentUser(@Headers('authorization') authorization?: string): Promise<UserInfoResponseDto> {
		if (!authorization) {
			throw new UnauthorizedException('未提供认证令牌');
		}

		const token = this.extractToken(authorization);

		try {
			const query = new GetCurrentUserQuery({ token });
			const result = await this.getCurrentUserHandler.handle(query);

			const response = new UserInfoResponseDto();
			response.userId = result.userId;
			response.email = result.email;
			response.name = result.name;
			response.image = result.image;
			response.emailVerified = result.emailVerified;
			response.organization = result.organization;
			response.role = result.role;
			response.permissions = result.permissions;
			response.sessionId = result.sessionId;
			response.sessionExpiresAt = result.sessionExpiresAt;

			return response;
		} catch (error) {
			throw new UnauthorizedException('无效或过期的会话');
		}
	}

	/**
	 * 获取当前会话信息
	 *
	 * @param authorization - Authorization 头
	 * @returns 会话信息
	 */
	@Get('session')
	async getSession(@Headers('authorization') authorization?: string): Promise<SessionResponseDto> {
		if (!authorization) {
			throw new UnauthorizedException('未提供认证令牌');
		}

		const token = this.extractToken(authorization);

		try {
			const query = new GetSessionQuery({ token });
			const result = await this.getSessionHandler.handle(query);

			const response = new SessionResponseDto();
			response.sessionId = result.sessionId;
			response.userId = result.userId;
			response.expiresAt = result.expiresAt;
			response.isValid = result.isValid;
			response.ipAddress = result.ipAddress;
			response.userAgent = result.userAgent;
			response.createdAt = result.createdAt;
			response.remainingSeconds = result.remainingSeconds;

			return response;
		} catch (error) {
			throw new UnauthorizedException('无效或过期的会话');
		}
	}

	/**
	 * 发送密码重置邮件
	 *
	 * @param dto - 密码重置请求
	 * @returns 成功消息
	 */
	@Post('forgot-password')
	async forgotPassword(@Body() dto: ForgotPasswordRequestDto): Promise<{ message: string }> {
		try {
			await this.authAdapter.sendPasswordResetEmail(dto.email, dto.callbackURL);
			return { message: '密码重置邮件已发送' };
		} catch (error) {
			throw new HttpException((error as Error).message || '发送重置邮件失败', HttpStatus.BAD_REQUEST);
		}
	}

	/**
	 * 重置密码
	 *
	 * @param dto - 重置密码请求
	 * @returns 成功消息
	 */
	@Post('reset-password')
	async resetPassword(@Body() dto: ResetPasswordRequestDto): Promise<{ message: string }> {
		try {
			await this.authAdapter.resetPassword(dto.token, dto.newPassword);
			return { message: '密码已重置' };
		} catch (error) {
			throw new HttpException((error as Error).message || '重置密码失败', HttpStatus.BAD_REQUEST);
		}
	}

	/**
	 * 发送邮箱验证邮件
	 *
	 * @param email - 用户邮箱
	 * @param callbackURL - 回调 URL
	 * @returns 成功消息
	 */
	@Post('verify-email/send')
	async sendVerificationEmail(
		@Body('email') email: string,
		@Body('callbackURL') callbackURL?: string
	): Promise<{ message: string }> {
		try {
			await this.authAdapter.sendVerificationEmail(email, callbackURL);
			return { message: '验证邮件已发送' };
		} catch (error) {
			throw new HttpException((error as Error).message || '发送验证邮件失败', HttpStatus.BAD_REQUEST);
		}
	}

	/**
	 * 验证邮箱
	 *
	 * @param dto - 验证邮箱请求
	 * @returns 成功消息
	 */
	@Post('verify-email')
	async verifyEmail(@Body() dto: VerifyEmailRequestDto): Promise<{ message: string }> {
		try {
			await this.authAdapter.verifyEmail(dto.token);
			return { message: '邮箱已验证' };
		} catch (error) {
			throw new HttpException((error as Error).message || '邮箱验证失败', HttpStatus.BAD_REQUEST);
		}
	}

	/**
	 * 刷新令牌
	 *
	 * @param dto - 刷新令牌请求
	 * @returns 新的认证结果
	 */
	@Post('refresh-token')
	async refreshToken(@Body() dto: RefreshTokenRequestDto): Promise<AuthResponseDto> {
		try {
			const result = await this.authAdapter.refreshToken(dto.refreshToken);

			const response = new AuthResponseDto();
			response.userId = result.userId.value;
			response.email = result.email.value;
			response.name = result.name;
			response.token = result.token;
			response.refreshToken = result.refreshToken;
			response.expiresAt = result.expiresAt;
			response.organization = result.organizationId
				? { id: result.organizationId, name: '', slug: '' }
				: undefined;
			response.role = result.role;

			return response;
		} catch (error) {
			throw new UnauthorizedException('刷新令牌无效或已过期');
		}
	}

	/**
	 * 从 Authorization 头提取令牌
	 */
	private extractToken(authorization: string): string {
		const parts = authorization.split(' ');
		if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
			throw new UnauthorizedException('无效的 Authorization 头格式');
		}
		return parts[1];
	}
}
