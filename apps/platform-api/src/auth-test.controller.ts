import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard, CurrentUser, type CurrentUserData } from '@oksai/auth';

/**
 * 认证测试控制器
 *
 * 提供受保护的路由用于测试认证功能
 */
@Controller('test')
export class AuthTestController {
	/**
	 * 受保护的资源端点
	 *
	 * 需要 JWT 认证才能访问
	 */
	@Get('protected')
	@UseGuards(JwtAuthGuard)
	getProtectedResource(@CurrentUser() user: CurrentUserData): {
		message: string;
		userId: string;
		timestamp: string;
	} {
		return {
			message: '这是一个受保护的资源',
			userId: user.id,
			timestamp: new Date().toISOString()
		};
	}

	/**
	 * 获取当前用户信息
	 *
	 * 需要 JWT 认证才能访问
	 */
	@Get('me')
	@UseGuards(JwtAuthGuard)
	getCurrentUser(@CurrentUser() user: CurrentUserData): CurrentUserData {
		return user;
	}

	/**
	 * 公开端点（无需认证）
	 *
	 * 用于验证服务是否正常运行
	 */
	@Get('public')
	getPublicResource(): { message: string; timestamp: string } {
		return {
			message: '这是一个公开的资源，无需认证',
			timestamp: new Date().toISOString()
		};
	}
}
