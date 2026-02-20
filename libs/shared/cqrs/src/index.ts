/**
 * @oksai/cqrs
 *
 * CQRS 模块，提供命令查询分离的基础设施。
 *
 * @packageDocumentation
 */

// Command
export { Command, type ICommand, type CommandMetadata } from './lib/commands/command';
export { type ICommandHandler } from './lib/commands/command-handler';
export { CommandBus } from './lib/commands/command-bus';

// Query
export { Query, type IQuery } from './lib/queries/query';
export { type IQueryHandler } from './lib/queries/query-handler';
export { QueryBus } from './lib/queries/query-bus';
