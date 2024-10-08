"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobQueueService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("../config");
const constants_1 = require("./constants");
const job_buffer_service_1 = require("./job-buffer/job-buffer.service");
const job_queue_1 = require("./job-queue");
/**
 * @description
 * The JobQueueService is used to create new {@link JobQueue} instances and access
 * existing jobs.
 *
 * @example
 * ```ts
 * // A service which transcodes video files
 * class VideoTranscoderService {
 *
 *   private jobQueue: JobQueue<{ videoId: string; }>;
 *
 *   async onModuleInit() {
 *     // The JobQueue is created on initialization
 *     this.jobQueue = await this.jobQueueService.createQueue({
 *       name: 'transcode-video',
 *       process: async job => {
 *         return await this.transcodeVideo(job.data.videoId);
 *       },
 *     });
 *   }
 *
 *   addToTranscodeQueue(videoId: string) {
 *     this.jobQueue.add({ videoId, })
 *   }
 *
 *   private async transcodeVideo(videoId: string) {
 *     // e.g. call some external transcoding service
 *   }
 *
 * }
 * ```
 *
 * @docsCategory JobQueue
 */
let JobQueueService = class JobQueueService {
    get jobQueueStrategy() {
        return this.configService.jobQueueOptions.jobQueueStrategy;
    }
    constructor(configService, jobBufferService) {
        this.configService = configService;
        this.jobBufferService = jobBufferService;
        this.queues = [];
        this.hasStarted = false;
    }
    /** @internal */
    onModuleDestroy() {
        this.hasStarted = false;
        return Promise.all(this.queues.map(q => q.stop()));
    }
    /**
     * @description
     * Configures and creates a new {@link JobQueue} instance.
     */
    async createQueue(options) {
        if (this.configService.jobQueueOptions.prefix) {
            options = Object.assign(Object.assign({}, options), { name: `${this.configService.jobQueueOptions.prefix}${options.name}` });
        }
        const wrappedProcessFn = this.createWrappedProcessFn(options.process);
        options = Object.assign(Object.assign({}, options), { process: wrappedProcessFn });
        const queue = new job_queue_1.JobQueue(options, this.jobQueueStrategy, this.jobBufferService);
        if (this.hasStarted && this.shouldStartQueue(queue.name)) {
            await queue.start();
        }
        this.queues.push(queue);
        return queue;
    }
    async start() {
        this.hasStarted = true;
        for (const queue of this.queues) {
            if (!queue.started && this.shouldStartQueue(queue.name)) {
                config_1.Logger.info(`Starting queue: ${queue.name}`, constants_1.loggerCtx);
                await queue.start();
            }
        }
    }
    /**
     * @description
     * Adds a {@link JobBuffer}, which will make it active and begin collecting
     * jobs to buffer.
     *
     * @since 1.3.0
     */
    addBuffer(buffer) {
        this.jobBufferService.addBuffer(buffer);
    }
    /**
     * @description
     * Removes a {@link JobBuffer}, prevent it from collecting and buffering any
     * subsequent jobs.
     *
     * @since 1.3.0
     */
    removeBuffer(buffer) {
        this.jobBufferService.removeBuffer(buffer);
    }
    /**
     * @description
     * Returns an object containing the number of buffered jobs arranged by bufferId. This
     * can be used to decide whether a particular buffer has any jobs to flush.
     *
     * Passing in JobBuffer instances _or_ ids limits the results to the specified JobBuffers.
     * If no argument is passed, sizes will be returned for _all_ JobBuffers.
     *
     * @example
     * ```ts
     * const sizes = await this.jobQueueService.bufferSize('buffer-1', 'buffer-2');
     *
     * // sizes = { 'buffer-1': 12, 'buffer-2': 3 }
     * ```
     *
     * @since 1.3.0
     */
    bufferSize(...forBuffers) {
        return this.jobBufferService.bufferSize(forBuffers);
    }
    /**
     * @description
     * Flushes the specified buffers, which means that the buffer is cleared and the jobs get
     * sent to the job queue for processing. Before sending the jobs to the job queue,
     * they will be passed through each JobBuffer's `reduce()` method, which is can be used
     * to optimize the amount of work to be done by e.g. de-duplicating identical jobs or
     * aggregating data over the collected jobs.
     *
     * Passing in JobBuffer instances _or_ ids limits the action to the specified JobBuffers.
     * If no argument is passed, _all_ JobBuffers will be flushed.
     *
     * Returns an array of all Jobs which were added to the job queue.
     *
     * @since 1.3.0
     */
    flush(...forBuffers) {
        return this.jobBufferService.flush(forBuffers);
    }
    /**
     * @description
     * Returns an array of `{ name: string; running: boolean; }` for each
     * registered JobQueue.
     */
    getJobQueues() {
        return this.queues.map(queue => ({
            name: queue.name,
            running: queue.started,
        }));
    }
    /**
     * We wrap the process function in order to catch any errors thrown and pass them to
     * any configured ErrorHandlerStrategies.
     */
    createWrappedProcessFn(processFn) {
        const { errorHandlers } = this.configService.systemOptions;
        return async (job) => {
            try {
                return await processFn(job);
            }
            catch (e) {
                for (const handler of errorHandlers) {
                    if (e instanceof Error) {
                        void handler.handleWorkerError(e, { job });
                    }
                }
                throw e;
            }
        };
    }
    shouldStartQueue(queueName) {
        if (this.configService.jobQueueOptions.activeQueues.length > 0) {
            if (!this.configService.jobQueueOptions.activeQueues.includes(queueName)) {
                return false;
            }
        }
        return true;
    }
};
exports.JobQueueService = JobQueueService;
exports.JobQueueService = JobQueueService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService, job_buffer_service_1.JobBufferService])
], JobQueueService);
//# sourceMappingURL=job-queue.service.js.map