/**
 * 应用层导出
 *
 * @packageDocumentation
 */

// Commands
export {
	Command,
	type CommandMetadata,
	SignInCommand,
	type SignInResult,
	SignUpCommand,
	type SignUpResult,
	SignOutCommand,
	type SignOutResult,
	SignInHandler,
	SignUpHandler,
	SignOutHandler,
} from './commands/index.js';

// Queries
export {
	Query,
	type QueryMetadata,
	GetCurrentUserQuery,
	type CurrentUserInfo,
	GetSessionQuery,
	type SessionDetails,
	GetCurrentUserHandler,
	GetSessionHandler,
} from './queries/index.js';
