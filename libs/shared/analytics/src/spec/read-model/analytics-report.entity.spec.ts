import { AnalyticsReportEntity } from '../../lib/read-model/analytics-report.entity';
import { AnalyticsReportType } from '../../lib/interfaces/analytics-report.interface';

/**
 * @description AnalyticsReportEntity 单元测试
 *
 * 测试覆盖：
 * - 实体创建与属性赋值
 * - 必填属性验证
 * - 可选属性处理
 * - 默认值设置
 * - JSON 字段类型支持
 */

describe('AnalyticsReportEntity', () => {
	describe('实体创建', () => {
		it('应正确创建实体实例', () => {
			const entity = new AnalyticsReportEntity();

			expect(entity).toBeDefined();
			expect(entity).toBeInstanceOf(AnalyticsReportEntity);
		});

		it('应自动设置 generatedAt 为当前时间', () => {
			const beforeCreate = new Date();

			const entity = new AnalyticsReportEntity();

			const afterCreate = new Date();
			expect(entity.generatedAt).toBeInstanceOf(Date);
			expect(entity.generatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
			expect(entity.generatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
		});

		it('应默认 isDeleted 为 false', () => {
			const entity = new AnalyticsReportEntity();

			expect(entity.isDeleted).toBe(false);
		});
	});

	describe('复合主键', () => {
		it('应正确设置 tenantId', () => {
			const entity = new AnalyticsReportEntity();
			entity.tenantId = 'tenant-123';

			expect(entity.tenantId).toBe('tenant-123');
		});

		it('应正确设置 reportId', () => {
			const entity = new AnalyticsReportEntity();
			entity.reportId = 'report-456';

			expect(entity.reportId).toBe('report-456');
		});

		it('应支持复合主键（tenantId + reportId）', () => {
			const entity = new AnalyticsReportEntity();
			entity.tenantId = 'tenant-789';
			entity.reportId = 'report-012';

			expect(entity.tenantId).toBe('tenant-789');
			expect(entity.reportId).toBe('report-012');
		});
	});

	describe('报表基本信息', () => {
		it('应正确设置 reportName', () => {
			const entity = new AnalyticsReportEntity();
			entity.reportName = '用户活跃度报表';

			expect(entity.reportName).toBe('用户活跃度报表');
		});

		it('应正确设置 reportType（SUMMARY）', () => {
			const entity = new AnalyticsReportEntity();
			entity.reportType = AnalyticsReportType.SUMMARY;

			expect(entity.reportType).toBe(AnalyticsReportType.SUMMARY);
		});

		it('应正确设置 reportType（TREND）', () => {
			const entity = new AnalyticsReportEntity();
			entity.reportType = AnalyticsReportType.TREND;

			expect(entity.reportType).toBe(AnalyticsReportType.TREND);
		});

		it('应正确设置 reportType（QUALITY）', () => {
			const entity = new AnalyticsReportEntity();
			entity.reportType = AnalyticsReportType.QUALITY;

			expect(entity.reportType).toBe(AnalyticsReportType.QUALITY);
		});

		it('应正确设置 reportType（COMPARISON）', () => {
			const entity = new AnalyticsReportEntity();
			entity.reportType = AnalyticsReportType.COMPARISON;

			expect(entity.reportType).toBe(AnalyticsReportType.COMPARISON);
		});

		it('应正确设置自定义 generatedAt', () => {
			const customDate = new Date('2024-06-15T10:30:00Z');

			const entity = new AnalyticsReportEntity();
			entity.generatedAt = customDate;

			expect(entity.generatedAt).toEqual(customDate);
		});

		it('应正确设置 expiresAt', () => {
			const expireDate = new Date('2024-12-31T23:59:59Z');

			const entity = new AnalyticsReportEntity();
			entity.expiresAt = expireDate;

			expect(entity.expiresAt).toEqual(expireDate);
		});

		it('expiresAt 应为可选', () => {
			const entity = new AnalyticsReportEntity();

			expect(entity.expiresAt).toBeUndefined();
		});
	});

	describe('报表配置（JSON 字段）', () => {
		it('应正确设置 reportConfig 对象', () => {
			const config = {
				groupBy: ['department', 'region'],
				filters: { status: 'active' },
				timeRange: { start: '2024-01-01', end: '2024-12-31' }
			};

			const entity = new AnalyticsReportEntity();
			entity.reportConfig = config;

			expect(entity.reportConfig).toEqual(config);
		});

		it('应支持复杂的嵌套配置对象', () => {
			const complexConfig = {
				aggregations: [
					{ function: 'COUNT', field: 'userId', alias: 'totalUsers' },
					{ function: 'SUM', field: 'amount', alias: 'totalAmount' }
				],
				nested: {
					level1: {
						level2: {
							value: 'deep-value'
						}
					}
				}
			};

			const entity = new AnalyticsReportEntity();
			entity.reportConfig = complexConfig;

			expect(entity.reportConfig).toEqual(complexConfig);
		});

		it('应支持空对象作为 reportConfig', () => {
			const entity = new AnalyticsReportEntity();
			entity.reportConfig = {};

			expect(entity.reportConfig).toEqual({});
		});
	});

	describe('报表数据（JSON 字段）', () => {
		it('应正确设置 reportRows 数组', () => {
			const rows = [
				{ department: '销售', count: 150, amount: 50000 },
				{ department: '技术', count: 80, amount: 30000 },
				{ department: '市场', count: 45, amount: 20000 }
			];

			const entity = new AnalyticsReportEntity();
			entity.reportRows = rows;

			expect(entity.reportRows).toEqual(rows);
			expect(entity.reportRows.length).toBe(3);
		});

		it('应支持空数组作为 reportRows', () => {
			const entity = new AnalyticsReportEntity();
			entity.reportRows = [];

			expect(entity.reportRows).toEqual([]);
		});

		it('应正确设置 reportSummary', () => {
			const summary = {
				totalRows: 100,
				totalRecords: 5000,
				aggregations: { totalCount: 5000, avgAmount: 1250.5 }
			};

			const entity = new AnalyticsReportEntity();
			entity.reportSummary = summary;

			expect(entity.reportSummary).toEqual(summary);
		});

		it('reportSummary 应为可选', () => {
			const entity = new AnalyticsReportEntity();

			expect(entity.reportSummary).toBeUndefined();
		});

		it('应正确设置 metadata', () => {
			const metadata = {
				generatedBy: 'system',
				version: '1.0',
				cached: true
			};

			const entity = new AnalyticsReportEntity();
			entity.metadata = metadata;

			expect(entity.metadata).toEqual(metadata);
		});

		it('metadata 应为可选', () => {
			const entity = new AnalyticsReportEntity();

			expect(entity.metadata).toBeUndefined();
		});
	});

	describe('审计字段', () => {
		it('应正确设置 createdBy', () => {
			const entity = new AnalyticsReportEntity();
			entity.createdBy = 'user-123';

			expect(entity.createdBy).toBe('user-123');
		});

		it('createdBy 应为可选', () => {
			const entity = new AnalyticsReportEntity();

			expect(entity.createdBy).toBeUndefined();
		});

		it('应正确设置 isDeleted 为 true', () => {
			const entity = new AnalyticsReportEntity();
			entity.isDeleted = true;

			expect(entity.isDeleted).toBe(true);
		});
	});

	describe('完整实体构建', () => {
		it('应正确构建完整的报表实体', () => {
			const config = { groupBy: ['region'], filters: {} };
			const rows = [{ region: '华东', count: 100 }];
			const summary = { totalRows: 1 };

			const entity = new AnalyticsReportEntity();
			entity.tenantId = 'tenant-001';
			entity.reportId = 'report-001';
			entity.reportName = '区域销售报表';
			entity.reportType = AnalyticsReportType.SUMMARY;
			entity.reportConfig = config;
			entity.reportRows = rows;
			entity.reportSummary = summary;
			entity.metadata = { cached: true };
			entity.createdBy = 'admin';
			entity.expiresAt = new Date('2024-12-31');

			expect(entity.tenantId).toBe('tenant-001');
			expect(entity.reportId).toBe('report-001');
			expect(entity.reportName).toBe('区域销售报表');
			expect(entity.reportType).toBe(AnalyticsReportType.SUMMARY);
			expect(entity.reportConfig).toEqual(config);
			expect(entity.reportRows).toEqual(rows);
			expect(entity.reportSummary).toEqual(summary);
			expect(entity.metadata).toEqual({ cached: true });
			expect(entity.createdBy).toBe('admin');
			expect(entity.generatedAt).toBeInstanceOf(Date);
			expect(entity.expiresAt).toBeInstanceOf(Date);
			expect(entity.isDeleted).toBe(false);
		});
	});
});
