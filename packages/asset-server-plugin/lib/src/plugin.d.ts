import { MiddlewareConsumer, NestModule, OnApplicationBootstrap } from '@nestjs/common';
import { Type } from '@vendure/common/lib/shared-types';
import { ProcessContext, RuntimeVendureConfig } from '@vendure/core';
import { AssetServerOptions } from './types';
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
export declare class AssetServerPlugin implements NestModule, OnApplicationBootstrap {
    private processContext;
    private static assetStorage;
    private readonly cacheDir;
    private presets;
    private static options;
    private cacheHeader;
    /**
     * @description
     * Set the plugin options.
     */
    static init(options: AssetServerOptions): Type<AssetServerPlugin>;
    /** @internal */
    static configure(config: RuntimeVendureConfig): Promise<RuntimeVendureConfig>;
    constructor(processContext: ProcessContext);
    /** @internal */
    onApplicationBootstrap(): void;
    configure(consumer: MiddlewareConsumer): void;
    /**
     * Creates the image server instance
     */
    private createAssetServer;
    /**
     * Reads the file requested and send the response to the browser.
     */
    private sendAsset;
    /**
     * If an exception was thrown by the first handler, then it may be because a transformed image
     * is being requested which does not yet exist. In this case, this handler will generate the
     * transformed image, save it to cache, and serve the result as a response.
     */
    private generateTransformedImage;
    private getFileNameFromRequest;
    private md5;
    private addSuffix;
    /**
     * Attempt to get the mime type from the file name.
     */
    private getMimeType;
}
