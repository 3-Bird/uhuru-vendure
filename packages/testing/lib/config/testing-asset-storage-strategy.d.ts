/// <reference types="node" />
/// <reference types="node" />
import { AssetStorageStrategy } from '@vendure/core';
import { Request } from 'express';
import { Stream } from 'stream';
/**
 * A mock storage strategy which does not actually persist the assets anywhere.
 */
export declare class TestingAssetStorageStrategy implements AssetStorageStrategy {
    readFileToBuffer(identifier: string): Promise<Buffer>;
    readFileToStream(identifier: string): Promise<Stream>;
    toAbsoluteUrl(reqest: Request, identifier: string): string;
    writeFileFromBuffer(fileName: string, data: Buffer): Promise<string>;
    writeFileFromStream(fileName: string, data: Stream): Promise<string>;
    fileExists(fileName: string): Promise<boolean>;
    deleteFile(identifier: string): Promise<void>;
}
