import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthController } from './auth.controller.js';
import { BetterAuthAdapter } from './adapters/secondary/better-auth/index.js';
import { UserSyncService } from './adapters/secondary/better-auth/user-sync.service.js';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './guards/index.js';
import {
	SignInHandler,
	SignUpHandler,
	SignOutHandler,
	GetCurrentUserHandler,
	GetSessionHandler
} from './application/handlers/index.js';
import type { IAuthPort } from '@oksai/identity';

/**
 * 认证模块
 *
 * 提供 Better Auth 集成的 NestJS 模块。
 * 此模块是全局模块，导出 BetterAuthAdapter、UserSyncService、Guards、Handlers 供其他模块使用。
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [AuthModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
	imports: [ConfigModule],

	controllers: [AuthController],

	providers: [
		// Better Auth 适配器作为 IAuthPort 实现
		{
			provide: 'IAuthPort',
			useClass: BetterAuthAdapter
		},
		BetterAuthAdapter,
		UserSyncService,
		// Guards
		JwtAuthGuard,
		OptionalJwtAuthGuard,
		// 应用层 Handlers
		SignInHandler,
		SignUpHandler,
		SignOutHandler,
		GetCurrentUserHandler,
		GetSessionHandler
	],

	exports: [
		'IAuthPort',
		BetterAuthAdapter,
		UserSyncService,
		JwtAuthGuard,
		OptionalJwtAuthGuard,
		SignInHandler,
		SignUpHandler,
		SignOutHandler,
		GetCurrentUserHandler,
		GetSessionHandler
	]
})
export class AuthModule {}
