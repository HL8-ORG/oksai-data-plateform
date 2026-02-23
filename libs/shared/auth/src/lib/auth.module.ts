import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';

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
 * 前置条件：应用层需要配置 MikroORM（通过 @oksai/database 的 setupMikroOrmModule）
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     ConfigModule.forRoot({ load: [createMikroOrmConfig] }),
 *     setupMikroOrmModule(),
 *     AuthModule
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
	imports: [
		ConfigModule,
		// 导入 MikroOrmModule 以访问 MikroORM provider
		MikroOrmModule.forFeature([]),
		// 导入 EventEmitterModule 以访问 EventEmitter2
		EventEmitterModule.forRoot()
	],

	controllers: [AuthController],

	providers: [
		// Better Auth 适配器 - 使用工厂提供者解决 MikroORM 依赖注入
		{
			provide: 'IAuthPort',
			useFactory: (orm: MikroORM, configService: ConfigService) => {
				return new BetterAuthAdapter(orm, configService);
			},
			inject: [MikroORM, ConfigService]
		},
		{
			provide: BetterAuthAdapter,
			useFactory: (orm: MikroORM, configService: ConfigService) => {
				return new BetterAuthAdapter(orm, configService);
			},
			inject: [MikroORM, ConfigService]
		},
		// UserSyncService - 使用工厂提供者
		{
			provide: UserSyncService,
			useFactory: (orm: MikroORM, eventEmitter: EventEmitter2) => {
				return new UserSyncService(orm, eventEmitter);
			},
			inject: [MikroORM, EventEmitter2]
		},
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
