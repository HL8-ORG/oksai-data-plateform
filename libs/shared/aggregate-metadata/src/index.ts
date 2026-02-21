/**
 * 聚合元数据包
 *
 * 提供跨域的聚合根元数据查询能力
 */

// 接口
export * from './lib/interfaces/aggregate-metadata.interface';

// 实体
export * from './lib/read-model/aggregate-metadata.entity';

// 服务
export * from './lib/services/aggregate-metadata-query.service';
export * from './lib/services/aggregate-metadata-projector';
