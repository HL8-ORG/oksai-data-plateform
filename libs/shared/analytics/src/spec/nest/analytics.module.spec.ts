import { Test, TestingModule } from '@nestjs/testing';
import { DataQualityScorerService } from '../../lib/services/data-quality-scorer.service';
import { AnalyticsDimensionCalculatorService } from '../../lib/services/analytics-dimension-calculator.service';
import { AnalyticsReportService } from '../../lib/services/analytics-report.service';
import { AnalyticsController } from '../../lib/nest/controllers/analytics.controller';

describe('AnalyticsModule', () => {
	describe('模块集成测试', () => {
		let module: TestingModule;

		beforeEach(async () => {
			const _mockOrm = {
				em: {
					getConnection: jest.fn().mockReturnValue({
						execute: jest.fn().mockResolvedValue([])
					})
				}
			};

			module = await Test.createTestingModule({
				controllers: [AnalyticsController],
				providers: [
					DataQualityScorerService,
					AnalyticsDimensionCalculatorService,
					{
						provide: AnalyticsReportService,
						useFactory: () => {
							const service = Object.create(AnalyticsReportService.prototype);
							Object.assign(service, {
								generateReport: jest.fn().mockResolvedValue({
									reportId: 'test',
									reportName: 'Test Report',
									reportType: 'SUMMARY',
									generatedAt: new Date(),
									rows: []
								}),
								generateReports: jest.fn().mockResolvedValue([]),
								getReportTemplate: jest.fn().mockReturnValue({
									id: 'template',
									name: 'Template',
									type: 'SUMMARY',
									groupBy: [],
									aggregations: []
								})
							});
							return service;
						}
					}
				]
			}).compile();
		});

		it('应该提供 DataQualityScorerService', () => {
			const service = module.get<DataQualityScorerService>(DataQualityScorerService);
			expect(service).toBeDefined();
			expect(service).toBeInstanceOf(DataQualityScorerService);
		});

		it('应该提供 AnalyticsDimensionCalculatorService', () => {
			const service = module.get<AnalyticsDimensionCalculatorService>(AnalyticsDimensionCalculatorService);
			expect(service).toBeDefined();
			expect(service).toBeInstanceOf(AnalyticsDimensionCalculatorService);
		});

		it('应该提供 AnalyticsReportService', () => {
			const service = module.get<AnalyticsReportService>(AnalyticsReportService);
			expect(service).toBeDefined();
		});

		it('应该提供 AnalyticsController', () => {
			const controller = module.get<AnalyticsController>(AnalyticsController);
			expect(controller).toBeDefined();
			expect(controller).toBeInstanceOf(AnalyticsController);
		});

		it('控制器应该能够访问所有服务', () => {
			const controller = module.get<AnalyticsController>(AnalyticsController);
			const qualityScorer = module.get<DataQualityScorerService>(DataQualityScorerService);
			const dimensionCalculator = module.get<AnalyticsDimensionCalculatorService>(
				AnalyticsDimensionCalculatorService
			);
			const reportService = module.get<AnalyticsReportService>(AnalyticsReportService);

			expect((controller as any).qualityScorer).toBe(qualityScorer);
			expect((controller as any).dimensionCalculator).toBe(dimensionCalculator);
			expect((controller as any).reportService).toBe(reportService);
		});
	});

	describe('服务功能测试', () => {
		let qualityScorer: DataQualityScorerService;
		let dimensionCalculator: AnalyticsDimensionCalculatorService;

		beforeEach(() => {
			qualityScorer = new DataQualityScorerService();
			dimensionCalculator = new AnalyticsDimensionCalculatorService();
		});

		it('DataQualityScorerService 应该能够计算质量分数', async () => {
			const aggregate = {
				aggregateType: 'Job',
				aggregateId: 'job-001',
				tenantId: 'tenant-001',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false
			};

			const result = await qualityScorer.score(aggregate);

			expect(result).toBeDefined();
			expect(result.totalScore).toBeGreaterThanOrEqual(0);
			expect(result.totalScore).toBeLessThanOrEqual(100);
			expect(result.dimensions).toBeInstanceOf(Array);
		});

		it('AnalyticsDimensionCalculatorService 应该能够计算维度', async () => {
			const aggregate = {
				aggregateType: 'Job',
				aggregateId: 'job-001',
				tenantId: 'tenant-001',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false
			};

			const result = await dimensionCalculator.calculate(aggregate);

			expect(result).toBeDefined();
			expect(typeof result).toBe('object');
		});

		it('AnalyticsDimensionCalculatorService 应该返回已注册的计算器', () => {
			const calculators = dimensionCalculator.getRegisteredCalculators();

			expect(calculators).toBeInstanceOf(Array);
			expect(calculators.length).toBeGreaterThan(0);
		});

		it('DataQualityScorerService 应该返回评分器信息', () => {
			const info = qualityScorer.getScorerInfo();

			expect(info).toBeDefined();
			expect(info.name).toBeDefined();
			expect(info.version).toBeDefined();
		});

		it('AnalyticsDimensionCalculatorService 应该返回所有支持的维度', () => {
			const dimensions = dimensionCalculator.getAllSupportedDimensions();

			expect(dimensions).toBeInstanceOf(Array);
			expect(dimensions.length).toBeGreaterThan(0);
		});
	});
});
