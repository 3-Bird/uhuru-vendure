/// <reference types="node" />
import sharp, { Region } from 'sharp';
import { ImageTransformPreset } from './types';
export type Dimensions = {
    w: number;
    h: number;
};
export type Point = {
    x: number;
    y: number;
};
/**
 * Applies transforms to the given image according to the query params passed.
 */
export declare function transformImage(
    originalImage: Buffer,
    queryParams: Record<string, string>,
    presets: ImageTransformPreset[],
): Promise<sharp.Sharp>;
/**
 * Resize an image but keep it centered on the focal point.
 * Based on the method outlined in https://github.com/lovell/sharp/issues/1198#issuecomment-384591756
 */
export declare function resizeToFocalPoint(
    original: Dimensions,
    target: Dimensions,
    focalPoint: Point,
): {
    width: number;
    height: number;
    region: Region;
};
