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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AssetServerPlugin_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetServerPlugin = void 0;
const core_1 = require("@vendure/core");
const crypto_1 = require("crypto");
const express_1 = __importDefault(require("express"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const common_1 = require("./common");
const constants_1 = require("./constants");
const default_asset_storage_strategy_factory_1 = require("./default-asset-storage-strategy-factory");
const hashed_asset_naming_strategy_1 = require("./hashed-asset-naming-strategy");
const sharp_asset_preview_strategy_1 = require("./sharp-asset-preview-strategy");
const transform_image_1 = require("./transform-image");
async function getFileType(buffer) {
    const { fileTypeFromBuffer } = await import('file-type');
    return fileTypeFromBuffer(buffer);
}
/**
 * @description
 * The `AssetServerPlugin` serves assets (images and other files) from the local file system, and can also be configured to use
 * other storage strategies (e.g. {@link S3AssetStorageStrategy}. It can also perform on-the-fly image transformations
 * and caches the results for subsequent calls.
 *
 * ## Installation
 *
 * `yarn add \@vendure/asset-server-plugin`
 *
 * or
 *
 * `npm install \@vendure/asset-server-plugin`
 *
 * @example
 * ```ts
 * import { AssetServerPlugin } from '\@vendure/asset-server-plugin';
 *
 * const config: VendureConfig = {
 *   // Add an instance of the plugin to the plugins array
 *   plugins: [
 *     AssetServerPlugin.init({
 *       route: 'assets',
 *       assetUploadDir: path.join(__dirname, 'assets'),
 *     }),
 *   ],
 * };
 * ```
 *
 * The full configuration is documented at [AssetServerOptions](/reference/core-plugins/asset-server-plugin/asset-server-options)
 *
 * ## Image transformation
 *
 * Asset preview images can be transformed (resized & cropped) on the fly by appending query parameters to the url:
 *
 * `http://localhost:3000/assets/some-asset.jpg?w=500&h=300&mode=resize`
 *
 * The above URL will return `some-asset.jpg`, resized to fit in the bounds of a 500px x 300px rectangle.
 *
 * ### Preview mode
 *
 * The `mode` parameter can be either `crop` or `resize`. See the [ImageTransformMode](/reference/core-plugins/asset-server-plugin/image-transform-mode) docs for details.
 *
 * ### Focal point
 *
 * When cropping an image (`mode=crop`), Vendure will attempt to keep the most "interesting" area of the image in the cropped frame. It does this
 * by finding the area of the image with highest entropy (the busiest area of the image). However, sometimes this does not yield a satisfactory
 * result - part or all of the main subject may still be cropped out.
 *
 * This is where specifying the focal point can help. The focal point of the image may be specified by passing the `fpx` and `fpy` query parameters.
 * These are normalized coordinates (i.e. a number between 0 and 1), so the `fpx=0&fpy=0` corresponds to the top left of the image.
 *
 * For example, let's say there is a very wide landscape image which we want to crop to be square. The main subject is a house to the far left of the
 * image. The following query would crop it to a square with the house centered:
 *
 * `http://localhost:3000/assets/landscape.jpg?w=150&h=150&mode=crop&fpx=0.2&fpy=0.7`
 *
 * ### Format
 *
 * Since v1.7.0, the image format can be specified by adding the `format` query parameter:
 *
 * `http://localhost:3000/assets/some-asset.jpg?format=webp`
 *
 * This means that, no matter the format of your original asset files, you can use more modern formats in your storefront if the browser
 * supports them. Supported values for `format` are:
 *
 * * `jpeg` or `jpg`
 * * `png`
 * * `webp`
 * * `avif`
 *
 * The `format` parameter can also be combined with presets (see below).
 *
 * ### Quality
 *
 * Since v2.2.0, the image quality can be specified by adding the `q` query parameter:
 *
 * `http://localhost:3000/assets/some-asset.jpg?q=75`
 *
 * This applies to the `jpg`, `webp` and `avif` formats. The default quality value for `jpg` and `webp` is 80, and for `avif` is 50.
 *
 * The `q` parameter can also be combined with presets (see below).
 *
 * ### Transform presets
 *
 * Presets can be defined which allow a single preset name to be used instead of specifying the width, height and mode. Presets are
 * configured via the AssetServerOptions [presets property](/reference/core-plugins/asset-server-plugin/asset-server-options/#presets).
 *
 * For example, defining the following preset:
 *
 * ```ts
 * AssetServerPlugin.init({
 *   // ...
 *   presets: [
 *     { name: 'my-preset', width: 85, height: 85, mode: 'crop' },
 *   ],
 * }),
 * ```
 *
 * means that a request to:
 *
 * `http://localhost:3000/assets/some-asset.jpg?preset=my-preset`
 *
 * is equivalent to:
 *
 * `http://localhost:3000/assets/some-asset.jpg?w=85&h=85&mode=crop`
 *
 * The AssetServerPlugin comes pre-configured with the following presets:
 *
 * name | width | height | mode
 * -----|-------|--------|-----
 * tiny | 50px | 50px | crop
 * thumb | 150px | 150px | crop
 * small | 300px | 300px | resize
 * medium | 500px | 500px | resize
 * large | 800px | 800px | resize
 *
 * ### Caching
 * By default, the AssetServerPlugin will cache every transformed image, so that the transformation only needs to be performed a single time for
 * a given configuration. Caching can be disabled per-request by setting the `?cache=false` query parameter.
 *
 * @docsCategory core plugins/AssetServerPlugin
 */
let AssetServerPlugin = AssetServerPlugin_1 = class AssetServerPlugin {
    /**
     * @description
     * Set the plugin options.
     */
    static init(options) {
        AssetServerPlugin_1.options = options;
        return this;
    }
    /** @internal */
    static async configure(config) {
        var _a;
        const storageStrategyFactory = this.options.storageStrategyFactory || default_asset_storage_strategy_factory_1.defaultAssetStorageStrategyFactory;
        this.assetStorage = await storageStrategyFactory(this.options);
        config.assetOptions.assetPreviewStrategy =
            (_a = this.options.previewStrategy) !== null && _a !== void 0 ? _a : new sharp_asset_preview_strategy_1.SharpAssetPreviewStrategy({
                maxWidth: this.options.previewMaxWidth,
                maxHeight: this.options.previewMaxHeight,
            });
        config.assetOptions.assetStorageStrategy = this.assetStorage;
        config.assetOptions.assetNamingStrategy =
            this.options.namingStrategy || new hashed_asset_naming_strategy_1.HashedAssetNamingStrategy();
        return config;
    }
    constructor(processContext) {
        this.processContext = processContext;
        this.cacheDir = 'cache';
        this.presets = [
            { name: 'tiny', width: 50, height: 50, mode: 'crop' },
            { name: 'thumb', width: 150, height: 150, mode: 'crop' },
            { name: 'small', width: 300, height: 300, mode: 'resize' },
            { name: 'medium', width: 500, height: 500, mode: 'resize' },
            { name: 'large', width: 800, height: 800, mode: 'resize' },
        ];
    }
    /** @internal */
    onApplicationBootstrap() {
        if (this.processContext.isWorker) {
            return;
        }
        if (AssetServerPlugin_1.options.presets) {
            for (const preset of AssetServerPlugin_1.options.presets) {
                const existingIndex = this.presets.findIndex(p => p.name === preset.name);
                if (-1 < existingIndex) {
                    this.presets.splice(existingIndex, 1, preset);
                }
                else {
                    this.presets.push(preset);
                }
            }
        }
        // Configure Cache-Control header
        const { cacheHeader } = AssetServerPlugin_1.options;
        if (!cacheHeader) {
            this.cacheHeader = constants_1.DEFAULT_CACHE_HEADER;
        }
        else {
            if (typeof cacheHeader === 'string') {
                this.cacheHeader = cacheHeader;
            }
            else {
                this.cacheHeader = [cacheHeader.restriction, `max-age: ${cacheHeader.maxAge}`]
                    .filter(value => !!value)
                    .join(', ');
            }
        }
        const cachePath = path_1.default.join(AssetServerPlugin_1.options.assetUploadDir, this.cacheDir);
        fs_extra_1.default.ensureDirSync(cachePath);
    }
    configure(consumer) {
        if (this.processContext.isWorker) {
            return;
        }
        core_1.Logger.info('Creating asset server middleware', constants_1.loggerCtx);
        consumer.apply(this.createAssetServer()).forRoutes(AssetServerPlugin_1.options.route);
        (0, core_1.registerPluginStartupMessage)('Asset server', AssetServerPlugin_1.options.route);
    }
    /**
     * Creates the image server instance
     */
    createAssetServer() {
        const assetServer = express_1.default.Router();
        assetServer.use(this.sendAsset(), this.generateTransformedImage());
        return assetServer;
    }
    /**
     * Reads the file requested and send the response to the browser.
     */
    sendAsset() {
        return async (req, res, next) => {
            var _a;
            const key = this.getFileNameFromRequest(req);
            try {
                const file = await AssetServerPlugin_1.assetStorage.readFileToBuffer(key);
                let mimeType = this.getMimeType(key);
                if (!mimeType) {
                    mimeType = ((_a = (await getFileType(file))) === null || _a === void 0 ? void 0 : _a.mime) || 'application/octet-stream';
                }
                res.contentType(mimeType);
                res.setHeader('content-security-policy', "default-src 'self'");
                res.setHeader('Cache-Control', this.cacheHeader);
                res.send(file);
            }
            catch (e) {
                const err = new Error('File not found');
                err.status = 404;
                return next(err);
            }
        };
    }
    /**
     * If an exception was thrown by the first handler, then it may be because a transformed image
     * is being requested which does not yet exist. In this case, this handler will generate the
     * transformed image, save it to cache, and serve the result as a response.
     */
    generateTransformedImage() {
        return async (err, req, res, next) => {
            var _a;
            if (err && (err.status === 404 || err.statusCode === 404)) {
                if (req.query) {
                    const decodedReqPath = decodeURIComponent(req.path);
                    core_1.Logger.debug(`Pre-cached Asset not found: ${decodedReqPath}`, constants_1.loggerCtx);
                    let file;
                    try {
                        file = await AssetServerPlugin_1.assetStorage.readFileToBuffer(decodedReqPath);
                    }
                    catch (_err) {
                        res.status(404).send('Resource not found');
                        return;
                    }
                    const image = await (0, transform_image_1.transformImage)(file, req.query, this.presets || []);
                    try {
                        const imageBuffer = await image.toBuffer();
                        const cachedFileName = this.getFileNameFromRequest(req);
                        if (!req.query.cache || req.query.cache === 'true') {
                            await AssetServerPlugin_1.assetStorage.writeFileFromBuffer(cachedFileName, imageBuffer);
                            core_1.Logger.debug(`Saved cached asset: ${cachedFileName}`, constants_1.loggerCtx);
                        }
                        let mimeType = this.getMimeType(cachedFileName);
                        if (!mimeType) {
                            mimeType = ((_a = (await getFileType(imageBuffer))) === null || _a === void 0 ? void 0 : _a.mime) || 'image/jpeg';
                        }
                        res.set('Content-Type', mimeType);
                        res.setHeader('content-security-policy', "default-src 'self'");
                        res.send(imageBuffer);
                        return;
                    }
                    catch (e) {
                        core_1.Logger.error(e.message, constants_1.loggerCtx, e.stack);
                        res.status(500).send('An error occurred when generating the image');
                        return;
                    }
                }
            }
            next();
        };
    }
    getFileNameFromRequest(req) {
        const { w, h, mode, preset, fpx, fpy, format, q } = req.query;
        /* eslint-disable @typescript-eslint/restrict-template-expressions */
        const focalPoint = fpx && fpy ? `_fpx${fpx}_fpy${fpy}` : '';
        const quality = q ? `_q${q}` : '';
        const imageFormat = (0, common_1.getValidFormat)(format);
        let imageParamsString = '';
        if (w || h) {
            const width = w || '';
            const height = h || '';
            imageParamsString = `_transform_w${width}_h${height}_m${mode}`;
        }
        else if (preset) {
            if (this.presets && !!this.presets.find(p => p.name === preset)) {
                imageParamsString = `_transform_pre_${preset}`;
            }
        }
        if (focalPoint) {
            imageParamsString += focalPoint;
        }
        if (imageFormat) {
            imageParamsString += imageFormat;
        }
        if (quality) {
            imageParamsString += quality;
        }
        /* eslint-enable @typescript-eslint/restrict-template-expressions */
        const decodedReqPath = decodeURIComponent(req.path);
        if (imageParamsString !== '') {
            const imageParamHash = this.md5(imageParamsString);
            return path_1.default.join(this.cacheDir, this.addSuffix(decodedReqPath, imageParamHash, imageFormat));
        }
        else {
            return decodedReqPath;
        }
    }
    md5(input) {
        return (0, crypto_1.createHash)('md5').update(input).digest('hex');
    }
    addSuffix(fileName, suffix, ext) {
        const originalExt = path_1.default.extname(fileName);
        const effectiveExt = ext ? `.${ext}` : originalExt;
        const baseName = path_1.default.basename(fileName, originalExt);
        const dirName = path_1.default.dirname(fileName);
        return path_1.default.join(dirName, `${baseName}${suffix}${effectiveExt}`);
    }
    /**
     * Attempt to get the mime type from the file name.
     */
    getMimeType(fileName) {
        const ext = path_1.default.extname(fileName);
        switch (ext) {
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.png':
                return 'image/png';
            case '.gif':
                return 'image/gif';
            case '.svg':
                return 'image/svg+xml';
            case '.tiff':
                return 'image/tiff';
            case '.webp':
                return 'image/webp';
        }
    }
};
exports.AssetServerPlugin = AssetServerPlugin;
exports.AssetServerPlugin = AssetServerPlugin = AssetServerPlugin_1 = __decorate([
    (0, core_1.VendurePlugin)({
        imports: [core_1.PluginCommonModule],
        configuration: config => AssetServerPlugin.configure(config),
        compatibility: '^3.0.0',
    }),
    __metadata("design:paramtypes", [core_1.ProcessContext])
], AssetServerPlugin);
//# sourceMappingURL=plugin.js.map