/// <reference types="node" />
import { AssetPreviewStrategy, RequestContext } from '@vendure/core';
/**
 * Returns a buffer of a small 48x48 placeholder image
 */
export declare function getTestImageBuffer(): Buffer;
/**
 * A mock preview strategy which returns a new Buffer without doing any actual work.
 */
export declare class TestingAssetPreviewStrategy implements AssetPreviewStrategy {
    generatePreviewImage(ctx: RequestContext, mimeType: string, data: Buffer): Promise<Buffer>;
}
