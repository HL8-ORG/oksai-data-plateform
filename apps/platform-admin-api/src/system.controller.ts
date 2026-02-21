import { Controller, Get } from '@nestjs/common';

/**
 * 系统管理控制器
 *
 * 提供系统状态、配置信息等管理接口
 */
@Controller('system')
export class SystemController {
	/**
	 * 获取系统信息
	 */
	@Get('info')
	getInfo(): {
		name: string;
		version: string;
		nodeVersion: string;
		platform: string;
		uptime: number;
	} {
		return {
			name: 'oksai-data-platform',
			version: '0.1.0',
			nodeVersion: process.version,
			platform: process.platform,
			uptime: process.uptime()
		};
	}

	/**
	 * 获取环境信息
	 */
	@Get('env')
	getEnv(): { nodeEnv: string; tz: string } {
		return {
			nodeEnv: process.env.NODE_ENV ?? 'development',
			tz: process.env.TZ ?? 'UTC'
		};
	}
}
