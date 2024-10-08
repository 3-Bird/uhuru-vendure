import { INestApplication } from '@nestjs/common';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { Type } from '@vendure/common/lib/shared-types';
import { RuntimeVendureConfig, VendureConfig } from './config/vendure-config';
import { VendureWorker } from './worker/vendure-worker';
export type VendureBootstrapFunction = (config: VendureConfig) => Promise<INestApplication>;
/**
 * @description
 * Additional options that can be used to configure the bootstrap process of the
 * Vendure server.
 *
 * @since 2.2.0
 * @docsCategory common
 * @docsPage bootstrap
 */
export interface BootstrapOptions {
    /**
     * @description
     * These options get passed directly to the `NestFactory.create()` method.
     */
    nestApplicationOptions: NestApplicationOptions;
}
/**
 * @description
 * Additional options that can be used to configure the bootstrap process of the
 * Vendure worker.
 *
 * @since 2.2.0
 * @docsCategory worker
 * @docsPage bootstrapWorker
 */
export interface BootstrapWorkerOptions {
    /**
     * @description
     * These options get passed directly to the `NestFactory.createApplicationContext` method.
     */
    nestApplicationContextOptions: NestApplicationContextOptions;
}
/**
 * @description
 * Bootstraps the Vendure server. This is the entry point to the application.
 *
 * @example
 * ```ts
 * import { bootstrap } from '\@vendure/core';
 * import { config } from './vendure-config';
 *
 * bootstrap(config).catch(err => {
 *   console.log(err);
 *   process.exit(1);
 * });
 * ```
 *
 * ### Passing additional options
 *
 * Since v2.2.0, you can pass additional options to the NestJs application via the `options` parameter.
 * For example, to integrate with the [Nest Devtools](https://docs.nestjs.com/devtools/overview), you need to
 * pass the `snapshot` option:
 *
 * ```ts
 * import { bootstrap } from '\@vendure/core';
 * import { config } from './vendure-config';
 *
 * bootstrap(config, {
 *   // highlight-start
 *   nestApplicationOptions: {
 *     snapshot: true,
 *   }
 *   // highlight-end
 * }).catch(err => {
 *   console.log(err);
 *   process.exit(1);
 * });
 * ```
 * @docsCategory common
 * @docsPage bootstrap
 * @docsWeight 0
 * */
export declare function bootstrap(
    userConfig: Partial<VendureConfig>,
    options?: BootstrapOptions,
): Promise<INestApplication>;
/**
 * @description
 * Bootstraps a Vendure worker. Resolves to a {@link VendureWorker} object containing a reference to the underlying
 * NestJs [standalone application](https://docs.nestjs.com/standalone-applications) as well as convenience
 * methods for starting the job queue and health check server.
 *
 * Read more about the [Vendure Worker](/guides/developer-guide/worker-job-queue/).
 *
 * @example
 * ```ts
 * import { bootstrapWorker } from '\@vendure/core';
 * import { config } from './vendure-config';
 *
 * bootstrapWorker(config)
 *   .then(worker => worker.startJobQueue())
 *   .then(worker => worker.startHealthCheckServer({ port: 3020 }))
 *   .catch(err => {
 *     console.log(err);
 *     process.exit(1);
 *   });
 * ```
 * @docsCategory worker
 * @docsPage bootstrapWorker
 * @docsWeight 0
 * */
export declare function bootstrapWorker(
    userConfig: Partial<VendureConfig>,
    options?: BootstrapWorkerOptions,
): Promise<VendureWorker>;
/**
 * Setting the global config must be done prior to loading the AppModule.
 */
export declare function preBootstrapConfig(
    userConfig: Partial<VendureConfig>,
): Promise<Readonly<RuntimeVendureConfig>>;
/**
 * Returns an array of core entities and any additional entities defined in plugins.
 */
export declare function getAllEntities(userConfig: Partial<VendureConfig>): Array<Type<any>>;
export declare function configureSessionCookies(
    app: INestApplication,
    userConfig: Readonly<RuntimeVendureConfig>,
): void;
