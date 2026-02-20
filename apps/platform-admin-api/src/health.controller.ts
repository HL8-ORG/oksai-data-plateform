import { Controller, Get } from '@nestjs/common';

/**
 * 健康检查控制器
 *
 * 提供管理后台服务健康状态检查接口
 */
@Controller('health')
export class HealthController {
	/**
	 * 健康检查接口
	 */
	@Get()
	check(): { status: string; timestamp: string; service: string } {
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			service: '@oksai/platform-admin-api',
		};
	}

	/**
	 * 就绪检查接口
	 */
	@Get('ready')
	ready(): { ready: boolean } {
		return {
			ready: true,
		};
	}
}
