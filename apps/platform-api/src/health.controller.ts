import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * 健康检查控制器
 *
 * 提供服务健康状态检查接口
 */
@ApiTags('系统监控')
@Controller('health')
export class HealthController {
	/**
	 * 健康检查接口
	 *
	 * @returns 服务状态信息
	 */
	@Get()
	@ApiOperation({ summary: '健康检查', description: '检查服务运行状态' })
	@ApiResponse({
		status: 200,
		description: '服务正常',
		schema: {
			type: 'object',
			properties: {
				status: { type: 'string', example: 'ok' },
				timestamp: { type: 'string', format: 'date-time' },
				service: { type: 'string', example: '@oksai/platform-api' }
			}
		}
	})
	check(): { status: string; timestamp: string; service: string } {
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			service: '@oksai/platform-api'
		};
	}

	/**
	 * 就绪检查接口
	 *
	 * @returns 就绪状态
	 */
	@Get('ready')
	@ApiOperation({ summary: '就绪检查', description: '检查服务是否已准备好接收请求' })
	@ApiResponse({
		status: 200,
		description: '服务已就绪',
		schema: {
			type: 'object',
			properties: {
				ready: { type: 'boolean', example: true }
			}
		}
	})
	ready(): { ready: boolean } {
		return {
			ready: true
		};
	}
}
