"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DefaultJobQueuePlugin_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultJobQueuePlugin = void 0;
const plugin_common_module_1 = require("../plugin-common.module");
const vendure_plugin_1 = require("../vendure-plugin");
const job_record_buffer_entity_1 = require("./job-record-buffer.entity");
const job_record_entity_1 = require("./job-record.entity");
const sql_job_buffer_storage_strategy_1 = require("./sql-job-buffer-storage-strategy");
const sql_job_queue_strategy_1 = require("./sql-job-queue-strategy");
/**
 * @description
 * A plugin which configures Vendure to use the SQL database to persist the JobQueue jobs using the {@link SqlJobQueueStrategy}. If you add this
 * plugin to an existing Vendure installation, you'll need to run a [database migration](/guides/developer-guide/migrations), since this
 * plugin will add a new "job_record" table to the database.
 *
 * @example
 * ```ts
 * import { DefaultJobQueuePlugin, VendureConfig } from '\@vendure/core';
 *
 * export const config: VendureConfig = {
 *   // Add an instance of the plugin to the plugins array
 *   plugins: [
 *     DefaultJobQueuePlugin,
 *   ],
 * };
 * ```
 *
 * ## Configuration
 *
 * It is possible to configure the behaviour of the {@link SqlJobQueueStrategy} by passing options to the static `init()` function:
 *
 * ### pollInterval
 * The interval in ms between polling for new jobs. The default is 200ms.
 * Using a longer interval reduces load on the database but results in a slight
 * delay in processing jobs. For more control, it is possible to supply a function which can specify
 * a pollInterval based on the queue name:
 *
 * @example
 * ```ts
 * export const config: VendureConfig = {
 *   plugins: [
 *     DefaultJobQueuePlugin.init({
 *       pollInterval: queueName => {
 *         if (queueName === 'cart-recovery-email') {
 *           // This queue does not need to be polled so frequently,
 *           // so we set a longer interval in order to reduce load
 *           // on the database.
 *           return 10000;
 *         }
 *         return 200;
 *       },
 *     }),
 *   ],
 * };
 * ```
 * ### concurrency
 * The number of jobs to process concurrently per worker. Defaults to 1.
 *
 * ### backoffStrategy
 * Defines the backoff strategy used when retrying failed jobs. In other words, if a job fails
 * and is configured to be re-tried, how long should we wait before the next attempt?
 *
 * By default, a job will be retried as soon as possible, but in some cases this is not desirable. For example,
 * a job may interact with an unreliable 3rd-party API which is sensitive to too many requests. In this case, an
 * exponential backoff may be used which progressively increases the delay between each subsequent retry.
 *
 * @example
 * ```ts
 * export const config: VendureConfig = {
 *   plugins: [
 *     DefaultJobQueuePlugin.init({
 *       pollInterval: 5000,
 *       concurrency: 2
 *       backoffStrategy: (queueName, attemptsMade, job) => {
 *         if (queueName === 'transcode-video') {
 *           // exponential backoff example
 *           return (attemptsMade ** 2) * 1000;
 *         }
 *
 *         // A default delay for all other queues
 *         return 1000;
 *       },
 *       setRetries: (queueName, job) => {
 *         if (queueName === 'send-email') {
 *           // Override the default number of retries
 *           // for the 'send-email' job because we have
 *           // a very unreliable email service.
 *           return 10;
 *         }
 *         return job.retries;
 *       }
 *     }),
 *   ],
 * };
 * ```
 *
 * @docsCategory JobQueue
 * @docsWeight 0
 */
let DefaultJobQueuePlugin = DefaultJobQueuePlugin_1 = class DefaultJobQueuePlugin {
    static init(options) {
        DefaultJobQueuePlugin_1.options = options;
        return DefaultJobQueuePlugin_1;
    }
};
exports.DefaultJobQueuePlugin = DefaultJobQueuePlugin;
/** @internal */
DefaultJobQueuePlugin.options = {};
exports.DefaultJobQueuePlugin = DefaultJobQueuePlugin = DefaultJobQueuePlugin_1 = __decorate([
    (0, vendure_plugin_1.VendurePlugin)({
        imports: [plugin_common_module_1.PluginCommonModule],
        entities: () => DefaultJobQueuePlugin.options.useDatabaseForBuffer === true
            ? [job_record_entity_1.JobRecord, job_record_buffer_entity_1.JobRecordBuffer]
            : [job_record_entity_1.JobRecord],
        configuration: config => {
            var _a;
            const { pollInterval, concurrency, backoffStrategy, setRetries, gracefulShutdownTimeout } = (_a = DefaultJobQueuePlugin.options) !== null && _a !== void 0 ? _a : {};
            config.jobQueueOptions.jobQueueStrategy = new sql_job_queue_strategy_1.SqlJobQueueStrategy({
                concurrency,
                pollInterval,
                backoffStrategy,
                setRetries,
                gracefulShutdownTimeout,
            });
            if (DefaultJobQueuePlugin.options.useDatabaseForBuffer === true) {
                config.jobQueueOptions.jobBufferStorageStrategy = new sql_job_buffer_storage_strategy_1.SqlJobBufferStorageStrategy();
            }
            return config;
        },
        compatibility: '>0.0.0',
    })
], DefaultJobQueuePlugin);
//# sourceMappingURL=default-job-queue-plugin.js.map