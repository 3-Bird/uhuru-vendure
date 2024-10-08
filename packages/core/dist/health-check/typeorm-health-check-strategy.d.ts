import { HealthIndicatorFunction } from '@nestjs/terminus';
import { Injector } from '../common/injector';
import { HealthCheckStrategy } from '../config/system/health-check-strategy';
export interface TypeORMHealthCheckOptions {
    key?: string;
    timeout?: number;
}
/**
 * @description
 * A {@link HealthCheckStrategy} used to check the health of the database. This health
 * check is included by default, but can be customized by explicitly adding it to the
 * `systemOptions.healthChecks` array:
 *
 * @example
 * ```ts
 * import { TypeORMHealthCheckStrategy } from '\@vendure/core';
 *
 * export const config = {
 *   // ...
 *   systemOptions: {
 *     healthChecks:[
 *         // The default key is "database" and the default timeout is 1000ms
 *         // Sometimes this is too short and leads to false negatives in the
 *         // /health endpoint.
 *         new TypeORMHealthCheckStrategy({ key: 'postgres-db', timeout: 5000 }),
 *     ]
 *   }
 * }
 * ```
 *
 * @docsCategory health-check
 */
export declare class TypeORMHealthCheckStrategy implements HealthCheckStrategy {
    private options?;
    constructor(options?: TypeORMHealthCheckOptions | undefined);
    init(injector: Injector): Promise<void>;
    getHealthIndicator(): HealthIndicatorFunction;
}
