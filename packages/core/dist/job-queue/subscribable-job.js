"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscribableJob = void 0;
const generated_types_1 = require("@vendure/common/lib/generated-types");
const pick_1 = require("@vendure/common/lib/pick");
const shared_utils_1 = require("@vendure/common/lib/shared-utils");
const ms_1 = __importDefault(require("ms"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const errors_1 = require("../common/error/errors");
const inspectable_job_queue_strategy_1 = require("../config/job-queue/inspectable-job-queue-strategy");
const job_1 = require("./job");
/**
 * @description
 * This is a type of Job object that allows you to subscribe to updates to the Job. It is returned
 * by the {@link JobQueue}'s `add()` method. Note that the subscription capability is only supported
 * if the {@link JobQueueStrategy} implements the {@link InspectableJobQueueStrategy} interface (e.g.
 * the {@link SqlJobQueueStrategy} does support this).
 *
 * @docsCategory JobQueue
 */
class SubscribableJob extends job_1.Job {
    constructor(job, jobQueueStrategy) {
        const config = Object.assign(Object.assign({}, job), { state: job.state, data: job.data, id: job.id || undefined });
        super(config);
        this.jobQueueStrategy = jobQueueStrategy;
    }
    /**
     * @description
     * Returns an Observable stream of updates to the Job. Works by polling the current JobQueueStrategy's `findOne()` method
     * to obtain updates. If this updates are not subscribed to, then no polling occurs.
     *
     * Polling interval, timeout and other options may be configured with an options arguments {@link JobUpdateOptions}.
     *
     */
    updates(options) {
        var _a, _b;
        const pollInterval = Math.max(50, (_a = options === null || options === void 0 ? void 0 : options.pollInterval) !== null && _a !== void 0 ? _a : 200);
        const timeoutMs = Math.max(pollInterval, (_b = options === null || options === void 0 ? void 0 : options.timeoutMs) !== null && _b !== void 0 ? _b : (0, ms_1.default)('1h'));
        const strategy = this.jobQueueStrategy;
        if (!(0, inspectable_job_queue_strategy_1.isInspectableJobQueueStrategy)(strategy)) {
            throw new errors_1.InternalServerError(`The configured JobQueueStrategy (${strategy.constructor.name}) is not inspectable, so Job updates cannot be subscribed to`);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return (0, rxjs_1.interval)(pollInterval).pipe((0, operators_1.tap)(i => {
                var _a;
                if (timeoutMs < i * pollInterval) {
                    throw new Error(`Job ${(_a = this.id) !== null && _a !== void 0 ? _a : ''} SubscribableJob update polling timed out after ${timeoutMs}ms. The job may still be running.`);
                }
            }), (0, operators_1.switchMap)(() => {
                const id = this.id;
                if (!id) {
                    throw new Error('Cannot subscribe to update: Job does not have an ID');
                }
                return strategy.findOne(id);
            }), (0, operators_1.filter)(shared_utils_1.notNullOrUndefined), (0, operators_1.distinctUntilChanged)((a, b) => (a === null || a === void 0 ? void 0 : a.progress) === (b === null || b === void 0 ? void 0 : b.progress) && (a === null || a === void 0 ? void 0 : a.state) === (b === null || b === void 0 ? void 0 : b.state)), (0, operators_1.takeWhile)(job => (job === null || job === void 0 ? void 0 : job.state) !== generated_types_1.JobState.FAILED &&
                job.state !== generated_types_1.JobState.COMPLETED &&
                job.state !== generated_types_1.JobState.CANCELLED, true), (0, operators_1.tap)(job => {
                var _a;
                if (job.state === generated_types_1.JobState.FAILED && ((_a = options === null || options === void 0 ? void 0 : options.errorOnFail) !== null && _a !== void 0 ? _a : true)) {
                    throw new Error(job.error);
                }
            }), (0, operators_1.map)(job => (0, pick_1.pick)(job, ['id', 'state', 'progress', 'result', 'error', 'data'])));
        }
    }
}
exports.SubscribableJob = SubscribableJob;
//# sourceMappingURL=subscribable-job.js.map