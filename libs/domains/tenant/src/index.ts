/**
 * @oksai/tenant
 *
 * 租户领域模块，提供多租户核心领域逻辑。
 *
 * @packageDocumentation
 */

// Domain Model - Value Objects
export { TenantId } from './domain/model/tenant-id.vo';
export { TenantName } from './domain/model/tenant-name.vo';
export { TenantPlan } from './domain/model/tenant-plan.vo';
export { TenantStatus } from './domain/model/tenant-status.vo';

// Domain Model - Aggregate Root
export { Tenant } from './domain/model/tenant.aggregate';

// Domain Events
export { TenantCreatedEvent, type TenantCreatedPayload } from './domain/events/tenant-created.domain-event';
export { TenantActivatedEvent, type TenantActivatedPayload } from './domain/events/tenant-activated.domain-event';
export { TenantSuspendedEvent, type TenantSuspendedPayload } from './domain/events/tenant-suspended.domain-event';
