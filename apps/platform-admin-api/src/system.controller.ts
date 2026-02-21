import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * 系统管理控制器
 *
 * 提供系统状态、配置信息等管理接口
 */
@ApiTags('系统管理')
@Controller('system')
export class SystemController {
	/**
	 * 获取系统信息
	 */
	@Get('info')
	@ApiOperation({ summary: '获取系统信息', description: '获取系统名称、版本、运行环境等信息' })
	@ApiResponse({
		status: 200,
		description: '获取成功',
		schema: {
			type: 'object',
			properties: {
				name: { type: 'string', example: 'oksai-data-platform' },
				version: { type: 'string', example: '0.1.0' },
				nodeVersion: { type: 'string', example: 'v22.0.0' },
				platform: { type: 'string', example: 'linux' },
				uptime: { type: 'number', example: 3600 }
			}
		}
	})
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
	@ApiOperation({ summary: '获取环境信息', description: '获取当前运行环境配置' })
	@ApiResponse({
		status: 200,
		description: '获取成功',
		schema: {
			type: 'object',
			properties: {
				nodeEnv: { type: 'string', example: 'development' },
				tz: { type: 'string', example: 'Asia/Shanghai' }
			}
		}
	})
	getEnv(): { nodeEnv: string; tz: string } {
		return {
			nodeEnv: process.env.NODE_ENV ?? 'development',
			tz: process.env.TZ ?? 'UTC'
		};
	}
}
