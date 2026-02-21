import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from '../../../lib/nest/controllers/analytics.controller';
import { DataQualityScorerService } from '../../../lib/services/data-quality-scorer.service';
import { AnalyticsDimensionCalculatorService } from '../../../lib/services/analytics-dimension-calculator.service';
import { AnalyticsReportService } from '../../../lib/services/analytics-report.service';
import { AnalyticsReportType } from '../../../lib/interfaces/analytics-report.interface';

describe('AnalyticsController', () => {
	let controller: AnalyticsController;
	let qualityScorer: jest.Mocked<DataQualityScorerService>;
	let dimensionCalculator: jest.Mocked<AnalyticsDimensionCalculatorService>;
	let reportService: jest.Mocked<AnalyticsReportService>;

	beforeEach(async () => {
		const mockQualityScorer = {
			score: jest.fn(),
			scoreBatch: jest.fn(),
			getScorerInfo: jest.fn()
		};
		const mockDimensionCalculator = {
			calculate: jest.fn(),
			getRegisteredCalculators: jest.fn(),
			getAllSupportedDimensions: jest.fn()
		};
		const mockReportService = {
			generateReport: jest.fn(),
			getReportTemplate: jest.fn()
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [AnalyticsController],
			providers: [
				{ provide: DataQualityScorerService, useValue: mockQualityScorer },
				{ provide: AnalyticsDimensionCalculatorService, useValue: mockDimensionCalculator },
				{ provide: AnalyticsReportService, useValue: mockReportService }
			]
		}).compile();

		controller = module.get<AnalyticsController>(AnalyticsController);
		qualityScorer = module.get(DataQualityScorerService);
		dimensionCalculator = module.get(AnalyticsDimensionCalculatorService);
		reportService = module.get(AnalyticsReportService);
	});

	describe('scoreQuality', () => {
		it('应该返回质量评分结果', async () => {
			qualityScorer.score.mockResolvedValue({
				totalScore: 85,
				dimensions: [
					{
						name: 'completeness',
						score: 90,
						weight: 0.5,
						weightedScore: 45,
						description: '数据完整性'
					}
				],
				scoredAt: new Date(),
				version: '1.0.0'
			});

			const result = await controller.scoreQuality({
				aggregateType: 'Job',
				aggregateId: 'job-001',
				tenantId: 'tenant-001'
			});

			expect(result.totalScore).toBe(85);
			expect(result.dimensions).toHaveLength(1);
			expect(qualityScorer.score).toHaveBeenCalled();
		});

		it('评估失败时应该抛出 BadRequestException', async () => {
			qualityScorer.score.mockRejectedValue(new Error('评分失败'));

			await expect(
				controller.scoreQuality({
					aggregateType: 'Job',
					aggregateId: 'job-001',
					tenantId: 'tenant-001'
				})
			).rejects.toThrow('数据质量评估失败');
		});
	});

	describe('batchScoreQuality', () => {
		it('应该返回批量质量评分结果', async () => {
			qualityScorer.scoreBatch.mockResolvedValue([
				{
					totalScore: 85,
					dimensions: [],
					scoredAt: new Date(),
					version: '1.0.0'
				},
				{
					totalScore: 90,
					dimensions: [],
					scoredAt: new Date(),
					version: '1.0.0'
				}
			]);

			const result = await controller.batchScoreQuality({
				aggregates: [
					{ aggregateType: 'Job', aggregateId: 'job-001', tenantId: 'tenant-001' },
					{ aggregateType: 'User', aggregateId: 'user-001', tenantId: 'tenant-001' }
				]
			});

			expect(result.results).toHaveLength(2);
			expect(result.results[0].totalScore).toBe(85);
			expect(result.results[1].totalScore).toBe(90);
		});

		it('批量评估失败时应该抛出 BadRequestException', async () => {
			qualityScorer.scoreBatch.mockRejectedValue(new Error('批量评分失败'));

			await expect(
				controller.batchScoreQuality({
					aggregates: [{ aggregateType: 'Job', aggregateId: 'job-001', tenantId: 'tenant-001' }]
				})
			).rejects.toThrow('批量数据质量评估失败');
		});
	});

	describe('calculateDimensions', () => {
		it('应该返回计算出的维度', async () => {
			dimensionCalculator.calculate.mockResolvedValue({
				time_year: 2026,
				time_month: 2,
				business_type: 'Job'
			});

			const result = await controller.calculateDimensions({
				aggregateType: 'Job',
				aggregateId: 'job-001',
				tenantId: 'tenant-001',
				calculatorNames: ['time', 'business']
			});

			expect(result.dimensions.time_year).toBe(2026);
			expect(result.dimensions.time_month).toBe(2);
			expect(dimensionCalculator.calculate).toHaveBeenCalled();
		});

		it('维度计算失败时应该抛出 BadRequestException', async () => {
			dimensionCalculator.calculate.mockRejectedValue(new Error('计算失败'));

			await expect(
				controller.calculateDimensions({
					aggregateType: 'Job',
					aggregateId: 'job-001',
					tenantId: 'tenant-001'
				})
			).rejects.toThrow('维度计算失败');
		});
	});

	describe('getRegisteredCalculators', () => {
		it('应该返回已注册的计算器列表', () => {
			dimensionCalculator.getRegisteredCalculators.mockReturnValue(['time', 'business']);
			dimensionCalculator.getAllSupportedDimensions.mockReturnValue(['time_year', 'time_month']);

			const result = controller.getRegisteredCalculators();

			expect(result.calculators).toEqual(['time', 'business']);
			expect(result.supportedDimensions).toEqual(['time_year', 'time_month']);
		});
	});

	describe('generateReport', () => {
		it('应该生成报表并返回结果', async () => {
			reportService.generateReport.mockResolvedValue({
				reportId: 'report-001',
				reportName: '测试报表',
				reportType: AnalyticsReportType.SUMMARY,
				generatedAt: new Date(),
				rows: [],
				summary: {
					totalRows: 0,
					totalRecords: 0
				}
			});

			const result = await controller.generateReport({
				reportId: 'report-001',
				reportName: '测试报表',
				reportType: AnalyticsReportType.SUMMARY,
				tenantId: 'tenant-001',
				groupBy: ['aggregateType']
			});

			expect(result.reportId).toBe('report-001');
			expect(result.reportName).toBe('测试报表');
			expect(reportService.generateReport).toHaveBeenCalled();
		});

		it('带时间范围时应该正确处理', async () => {
			reportService.generateReport.mockResolvedValue({
				reportId: 'report-001',
				reportName: '测试报表',
				reportType: AnalyticsReportType.TREND,
				generatedAt: new Date(),
				rows: []
			});

			await controller.generateReport({
				reportId: 'report-001',
				reportName: '趋势报表',
				reportType: AnalyticsReportType.TREND,
				tenantId: 'tenant-001',
				groupBy: ['time_month'],
				startTime: '2026-01-01T00:00:00Z',
				endTime: '2026-02-28T23:59:59Z',
				granularity: 'month'
			});

			expect(reportService.generateReport).toHaveBeenCalledWith(
				expect.objectContaining({
					timeRange: expect.objectContaining({
						granularity: 'month'
					})
				})
			);
		});

		it('报表生成失败时应该抛出 BadRequestException', async () => {
			reportService.generateReport.mockRejectedValue(new Error('生成失败'));

			await expect(
				controller.generateReport({
					reportId: 'report-001',
					reportName: '测试报表',
					reportType: AnalyticsReportType.SUMMARY,
					tenantId: 'tenant-001',
					groupBy: []
				})
			).rejects.toThrow('报表生成失败');
		});
	});

	describe('getReportTemplate', () => {
		it('应该返回报表模板', () => {
			reportService.getReportTemplate.mockReturnValue({
				id: 'template-summary',
				name: '汇总报表模板',
				type: AnalyticsReportType.SUMMARY,
				groupBy: ['aggregateType'],
				aggregations: []
			});

			const result = controller.getReportTemplate({ reportType: AnalyticsReportType.SUMMARY });

			expect(result.template).toBeDefined();
			expect(result.template.type).toBe(AnalyticsReportType.SUMMARY);
		});
	});

	describe('getServiceInfo', () => {
		it('应该返回服务信息', () => {
			qualityScorer.getScorerInfo.mockReturnValue({ name: 'default', version: '1.0.0' });
			dimensionCalculator.getRegisteredCalculators.mockReturnValue(['time']);
			dimensionCalculator.getAllSupportedDimensions.mockReturnValue(['time_year']);

			const result = controller.getServiceInfo();

			expect(result.qualityScorer).toBeDefined();
			expect(result.calculators.registered).toEqual(['time']);
			expect(result.version).toBe('1.0.0');
			expect(result.reportTypes).toContain(AnalyticsReportType.SUMMARY);
		});
	});
});
