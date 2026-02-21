import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsReportService } from '../../lib/services/analytics-report.service';
import { AnalyticsReportType } from '../../lib/interfaces/analytics-report.interface';
import { MikroORM } from '@mikro-orm/core';

/**
 * @description AnalyticsReportService 单元测试
 *
 * 测试覆盖：
 * - 服务初始化和依赖注入
 * - 报表模板获取
 * - 汇总报表生成
 * - 趋势报表生成
 * - 质量报表生成
 * - 对比报表生成
 * - 批量报表生成
 * - WHERE 条件构建
 * - 错误处理
 */
describe('AnalyticsReportService', () => {
	let service: AnalyticsReportService;
	let mockConnection: { execute: jest.Mock };
	let mockEm: { getConnection: jest.Mock; fork: jest.Mock; persistAndFlush: jest.Mock; create: jest.Mock };
	let mockOrm: { em: any };

	const mockReportRows = [
		{ aggregate_type: 'Billing', count: 100, avg_quality_score: 85.5 },
		{ aggregate_type: 'Order', count: 50, avg_quality_score: 72.3 }
	];

	beforeEach(async () => {
		mockConnection = {
			execute: jest.fn().mockResolvedValue(mockReportRows)
		};

		mockEm = {
			getConnection: jest.fn().mockReturnValue(mockConnection),
			fork: jest.fn().mockReturnThis(),
			persistAndFlush: jest.fn().mockResolvedValue(undefined),
			create: jest.fn().mockReturnValue({})
		};

		mockOrm = {
			em: mockEm
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AnalyticsReportService,
				{
					provide: MikroORM,
					useValue: mockOrm
				}
			]
		}).compile();

		service = module.get<AnalyticsReportService>(AnalyticsReportService);
	});

	describe('服务初始化', () => {
		it('应该成功创建服务实例', () => {
			expect(service).toBeDefined();
		});
	});

	describe('获取报表模板', () => {
		it('应该返回汇总报表模板', () => {
			const template = service.getReportTemplate(AnalyticsReportType.SUMMARY);

			expect(template.id).toBe('template-summary');
			expect(template.name).toBe('汇总报表模板');
			expect(template.type).toBe(AnalyticsReportType.SUMMARY);
			expect(template.groupBy).toContain('aggregate_type');
		});

		it('应该返回趋势报表模板', () => {
			const template = service.getReportTemplate(AnalyticsReportType.TREND);

			expect(template.id).toBe('template-trend');
			expect(template.name).toBe('趋势报表模板');
			expect(template.type).toBe(AnalyticsReportType.TREND);
			expect(template.timeRange).toBeDefined();
			expect(template.groupBy).toContain('time_year');
		});

		it('应该返回质量报表模板', () => {
			const template = service.getReportTemplate(AnalyticsReportType.QUALITY);

			expect(template.id).toBe('template-quality');
			expect(template.name).toBe('质量报表模板');
			expect(template.type).toBe(AnalyticsReportType.QUALITY);
			expect(template.groupBy).toContain('aggregate_type');
		});

		it('应该返回对比报表模板', () => {
			const template = service.getReportTemplate(AnalyticsReportType.COMPARISON);

			expect(template.id).toBe('template-comparison');
			expect(template.name).toBe('对比报表模板');
			expect(template.type).toBe(AnalyticsReportType.COMPARISON);
			expect(template.groupBy).toContain('aggregate_type');
			expect(template.groupBy).toContain('category');
		});

		it('应该对不支持的报表类型抛出错误', () => {
			expect(() => service.getReportTemplate('UNKNOWN' as AnalyticsReportType)).toThrow('不支持的报表类型');
		});
	});

	describe('汇总报表生成', () => {
		it('应该成功生成汇总报表', async () => {
			const config = {
				id: 'test-summary-report',
				name: '测试汇总报表',
				type: AnalyticsReportType.SUMMARY,
				groupBy: ['aggregate_type'],
				filters: { tenantId: 'tenant-123' },
				aggregations: [
					{ function: 'COUNT' as const, field: '*', alias: 'count' },
					{ function: 'AVG' as const, field: 'quality_score', alias: 'avg_quality_score' }
				]
			};

			const result = await service.generateReport(config);

			expect(result.reportId).toBe('test-summary-report');
			expect(result.reportName).toBe('测试汇总报表');
			expect(result.reportType).toBe(AnalyticsReportType.SUMMARY);
			expect(result.rows).toBeDefined();
			expect(result.summary).toBeDefined();
			expect(result.generatedAt).toBeInstanceOf(Date);
		});

		it('应该正确构建 GROUP BY 查询', async () => {
			const config = {
				id: 'test-report',
				name: '测试报表',
				type: AnalyticsReportType.SUMMARY,
				groupBy: ['aggregate_type', 'category'],
				filters: { tenantId: 'tenant-123' },
				aggregations: [{ function: 'COUNT' as const, field: '*', alias: 'total' }]
			};

			await service.generateReport(config);

			expect(mockConnection.execute).toHaveBeenCalled();
			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('GROUP BY');
			expect(sql).toContain('aggregate_type, category');
		});
	});

	describe('趋势报表生成', () => {
		it('应该成功生成趋势报表', async () => {
			const config = {
				id: 'test-trend-report',
				name: '测试趋势报表',
				type: AnalyticsReportType.TREND,
				groupBy: ['time_year', 'time_month'],
				filters: { tenantId: 'tenant-123' },
				timeRange: {
					start: new Date('2024-01-01'),
					end: new Date('2024-12-31'),
					granularity: 'month' as const
				},
				aggregations: [{ function: 'COUNT' as const, field: '*', alias: 'count' }]
			};

			const result = await service.generateReport(config);

			expect(result.reportId).toBe('test-trend-report');
			expect(result.reportType).toBe(AnalyticsReportType.TREND);
		});

		it('应该要求 timeRange 配置', async () => {
			const config = {
				id: 'test-trend-report',
				name: '测试趋势报表',
				type: AnalyticsReportType.TREND,
				groupBy: ['time_year'],
				filters: { tenantId: 'tenant-123' },
				aggregations: [{ function: 'COUNT' as const, field: '*', alias: 'count' }]
			} as any;

			await expect(service.generateReport(config)).rejects.toThrow('趋势报表必须配置 timeRange');
		});

		it('应该在 SQL 中包含时间条件', async () => {
			const config = {
				id: 'test-trend-report',
				name: '测试趋势报表',
				type: AnalyticsReportType.TREND,
				groupBy: ['time_year'],
				filters: { tenantId: 'tenant-123' },
				timeRange: {
					start: new Date('2024-01-01'),
					end: new Date('2024-12-31'),
					granularity: 'month' as const
				},
				aggregations: [{ function: 'COUNT' as const, field: '*', alias: 'count' }]
			};

			await service.generateReport(config);

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('created_at >=');
			expect(sql).toContain('created_at <=');
		});
	});

	describe('质量报表生成', () => {
		it('应该成功生成质量报表', async () => {
			const config = {
				id: 'test-quality-report',
				name: '测试质量报表',
				type: AnalyticsReportType.QUALITY,
				groupBy: ['aggregate_type'],
				filters: { tenantId: 'tenant-123' },
				aggregations: [
					{ function: 'AVG' as const, field: 'quality_score', alias: 'avg_score' },
					{ function: 'COUNT' as const, field: '*', alias: 'total_count' }
				]
			};

			const result = await service.generateReport(config);

			expect(result.reportId).toBe('test-quality-report');
			expect(result.reportType).toBe(AnalyticsReportType.QUALITY);
			expect(result.summary?.qualityStats).toBeDefined();
		});
	});

	describe('对比报表生成', () => {
		it('应该成功生成对比报表', async () => {
			const config = {
				id: 'test-comparison-report',
				name: '测试对比报表',
				type: AnalyticsReportType.COMPARISON,
				groupBy: ['aggregate_type', 'category'],
				filters: { tenantId: 'tenant-123' },
				aggregations: [
					{ function: 'COUNT' as const, field: '*', alias: 'count' },
					{ function: 'SUM' as const, field: 'amount', alias: 'total_amount' }
				]
			};

			const result = await service.generateReport(config);

			expect(result.reportId).toBe('test-comparison-report');
			expect(result.reportType).toBe(AnalyticsReportType.COMPARISON);
		});
	});

	describe('批量报表生成', () => {
		it('应该批量生成多个报表', async () => {
			const configs = [
				{
					id: 'report-1',
					name: '报表1',
					type: AnalyticsReportType.SUMMARY,
					groupBy: ['aggregate_type'],
					filters: { tenantId: 'tenant-123' },
					aggregations: [{ function: 'COUNT' as const, field: '*', alias: 'count' }]
				},
				{
					id: 'report-2',
					name: '报表2',
					type: AnalyticsReportType.SUMMARY,
					groupBy: ['category'],
					filters: { tenantId: 'tenant-123' },
					aggregations: [{ function: 'COUNT' as const, field: '*', alias: 'count' }]
				}
			];

			const results = await service.generateReports(configs);

			expect(results).toHaveLength(2);
			expect(results[0].reportId).toBe('report-1');
			expect(results[1].reportId).toBe('report-2');
		});
	});

	describe('过滤条件构建', () => {
		it('应该包含租户 ID 过滤', async () => {
			const config = {
				id: 'test-report',
				name: '测试报表',
				type: AnalyticsReportType.SUMMARY,
				groupBy: ['aggregate_type'],
				filters: { tenantId: 'tenant-abc' },
				aggregations: [{ function: 'COUNT' as const, field: '*', alias: 'count' }]
			};

			await service.generateReport(config);

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain("tenant_id = 'tenant-abc'");
		});

		it('应该包含聚合类型过滤', async () => {
			const config = {
				id: 'test-report',
				name: '测试报表',
				type: AnalyticsReportType.SUMMARY,
				groupBy: ['aggregate_type'],
				filters: { tenantId: 'tenant-123', aggregateType: ['Billing', 'Order'] },
				aggregations: [{ function: 'COUNT' as const, field: '*', alias: 'count' }]
			};

			await service.generateReport(config);

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain("aggregate_type IN ('Billing', 'Order')");
		});

		it('应该包含分类过滤', async () => {
			const config = {
				id: 'test-report',
				name: '测试报表',
				type: AnalyticsReportType.SUMMARY,
				groupBy: ['category'],
				filters: { tenantId: 'tenant-123', category: ['subscription'] },
				aggregations: [{ function: 'COUNT' as const, field: '*', alias: 'count' }]
			};

			await service.generateReport(config);

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain("category IN ('subscription')");
		});

		it('应该包含默认的 is_deleted 过滤', async () => {
			const config = {
				id: 'test-report',
				name: '测试报表',
				type: AnalyticsReportType.SUMMARY,
				groupBy: ['aggregate_type'],
				filters: { tenantId: 'tenant-123' },
				aggregations: [{ function: 'COUNT' as const, field: '*', alias: 'count' }]
			};

			await service.generateReport(config);

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('is_deleted = false');
		});
	});

	describe('错误处理', () => {
		it('应该处理不支持的报表类型', async () => {
			const config = {
				id: 'test-report',
				name: '测试报表',
				type: 'UNKNOWN' as AnalyticsReportType,
				groupBy: ['aggregate_type'],
				filters: { tenantId: 'tenant-123' },
				aggregations: [{ function: 'COUNT' as const, field: '*', alias: 'count' }]
			};

			await expect(service.generateReport(config)).rejects.toThrow('不支持的报表类型');
		});

		it('应该处理数据库查询错误', async () => {
			mockConnection.execute.mockRejectedValue(new Error('数据库连接失败'));

			const config = {
				id: 'test-report',
				name: '测试报表',
				type: AnalyticsReportType.SUMMARY,
				groupBy: ['aggregate_type'],
				filters: { tenantId: 'tenant-123' },
				aggregations: [{ function: 'COUNT' as const, field: '*', alias: 'count' }]
			};

			await expect(service.generateReport(config)).rejects.toThrow('数据库连接失败');
		});
	});

	describe('报表结果保存', () => {
		it('应该尝试保存报表结果', async () => {
			const config = {
				id: 'test-report',
				name: '测试报表',
				type: AnalyticsReportType.SUMMARY,
				groupBy: ['aggregate_type'],
				filters: { tenantId: 'tenant-123' },
				aggregations: [{ function: 'COUNT' as const, field: '*', alias: 'count' }]
			};

			await service.generateReport(config);

			expect(mockEm.create).toHaveBeenCalled();
			expect(mockEm.persistAndFlush).toHaveBeenCalled();
		});

		it('保存失败时不应该影响报表返回', async () => {
			mockEm.persistAndFlush.mockRejectedValue(new Error('保存失败'));

			const config = {
				id: 'test-report',
				name: '测试报表',
				type: AnalyticsReportType.SUMMARY,
				groupBy: ['aggregate_type'],
				filters: { tenantId: 'tenant-123' },
				aggregations: [{ function: 'COUNT' as const, field: '*', alias: 'count' }]
			};

			const result = await service.generateReport(config);

			expect(result).toBeDefined();
			expect(result.reportId).toBe('test-report');
		});
	});
});
