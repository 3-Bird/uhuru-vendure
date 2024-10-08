import { VendureConfig } from '@vendure/core';
import { VendureConfigRef } from '../../shared/vendure-config-ref';
export declare function loadVendureConfigFile(
    vendureConfig: VendureConfigRef,
    providedTsConfigPath?: string,
): Promise<VendureConfig>;
