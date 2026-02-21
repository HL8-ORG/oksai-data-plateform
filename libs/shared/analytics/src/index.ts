/**
 * @description 数据分析能力包
 *
 * 提供以下核心功能：
 * - 数据质量评分（IDataQualityScorer）
 * - 分析维度计算（IAnalyticsDimensionCalculator）
 * - 分析报表生成（IAnalyticsReportService）
 * - 分析读模型（AnalyticsReportEntity）
 */

// 导出接口
export * from './lib/interfaces/data-quality.interface';
export * from './lib/interfaces/analytics-dimensions.interface';
export * from './lib/interfaces/analytics-report.interface';

// 导出服务
export * from './lib/services/data-quality-scorer.service';
export * from './lib/services/analytics-dimension-calculator.service';
export * from './lib/services/analytics-report.service';

// 导出计算器
export * from './lib/calculators/default-quality-scorer';
export * from './lib/calculators/time-dimension-calculator';
export * from './lib/calculators/business-dimension-calculator';

// 导出读模型
export * from './lib/read-model/analytics-report.entity';

// 导出 NestJS 模块
export * from './lib/nest/analytics.module';
export * from './lib/nest/controllers/analytics.controller';
export * from './lib/nest/dto/analytics.dto';
