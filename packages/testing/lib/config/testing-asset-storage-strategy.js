"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestingAssetStorageStrategy = void 0;
const stream_1 = require("stream");
const testing_asset_preview_strategy_1 = require("./testing-asset-preview-strategy");
/**
 * A mock storage strategy which does not actually persist the assets anywhere.
 */
class TestingAssetStorageStrategy {
    readFileToBuffer(identifier) {
        return Promise.resolve((0, testing_asset_preview_strategy_1.getTestImageBuffer)());
    }
    readFileToStream(identifier) {
        const s = new stream_1.Readable();
        s.push(identifier);
        s.push(null);
        return Promise.resolve(s);
    }
    toAbsoluteUrl(reqest, identifier) {
        const prefix = 'test-url/';
        return identifier.startsWith(prefix) ? identifier : `${prefix}${identifier}`;
    }
    writeFileFromBuffer(fileName, data) {
        return Promise.resolve(`test-assets/${fileName}`);
    }
    writeFileFromStream(fileName, data) {
        const writable = new stream_1.Writable();
        writable._write = (chunk, encoding, done) => {
            done();
        };
        return new Promise((resolve, reject) => {
            data.pipe(writable);
            writable.on('finish', () => resolve(`test-assets/${fileName}`));
            writable.on('error', reject);
        });
    }
    fileExists(fileName) {
        return Promise.resolve(false);
    }
    deleteFile(identifier) {
        return Promise.resolve();
    }
}
exports.TestingAssetStorageStrategy = TestingAssetStorageStrategy;
//# sourceMappingURL=testing-asset-storage-strategy.js.map