/// <reference types="node" />
import { ImportInfo, LanguageCode } from '@vendure/common/lib/generated-types';
import { ID } from '@vendure/common/lib/shared-types';
import { Observable } from 'rxjs';
import { Stream } from 'stream';
import { RequestContext } from '../../../api/common/request-context';
import { ConfigService } from '../../../config/config.service';
import { CustomFieldConfig } from '../../../config/custom-field/custom-field-types';
import { ChannelService } from '../../../service/services/channel.service';
import { FacetValueService } from '../../../service/services/facet-value.service';
import { FacetService } from '../../../service/services/facet.service';
import { TaxCategoryService } from '../../../service/services/tax-category.service';
import { AssetImporter } from '../asset-importer/asset-importer';
import { ImportParser, ParsedFacet, ParsedProductWithVariants } from '../import-parser/import-parser';
import { FastImporterService } from './fast-importer.service';
export interface ImportProgress extends ImportInfo {
    currentProduct: string;
}
export type OnProgressFn = (progess: ImportProgress) => void;
/**
 * @description
 * Parses and imports Products using the CSV import format.
 *
 * Internally it is using the {@link ImportParser} to parse the CSV file, and then the
 * {@link FastImporterService} and the {@link AssetImporter} to actually create the resulting
 * entities in the Vendure database.
 *
 * @docsCategory import-export
 */
export declare class Importer {
    private configService;
    private importParser;
    private channelService;
    private facetService;
    private facetValueService;
    private taxCategoryService;
    private assetImporter;
    private fastImporter;
    private taxCategoryMatches;
    private facetMap;
    private facetValueMap;
    /** @internal */
    constructor(
        configService: ConfigService,
        importParser: ImportParser,
        channelService: ChannelService,
        facetService: FacetService,
        facetValueService: FacetValueService,
        taxCategoryService: TaxCategoryService,
        assetImporter: AssetImporter,
        fastImporter: FastImporterService,
    );
    /**
     * @description
     * Parses the contents of the [product import CSV file](/guides/developer-guide/importing-data/#product-import-format) and imports
     * the resulting Product & ProductVariants, as well as any associated Assets, Facets & FacetValues.
     *
     * The `ctxOrLanguageCode` argument is used to specify the languageCode to be used when creating the Products.
     */
    parseAndImport(
        input: string | Stream,
        ctxOrLanguageCode: RequestContext | LanguageCode,
        reportProgress?: boolean,
    ): Observable<ImportProgress>;
    private doParseAndImport;
    private getRequestContext;
    /**
     * @description
     * Imports the products specified in the rows object. Return an array of error messages.
     */
    importProducts(
        ctx: RequestContext,
        rows: ParsedProductWithVariants[],
        onProgress: OnProgressFn,
    ): Promise<string[]>;
    protected getFacetValueIds(
        ctx: RequestContext,
        facets: ParsedFacet[],
        languageCode: LanguageCode,
    ): Promise<ID[]>;
    protected processCustomFieldValues(
        customFields: {
            [field: string]: string;
        },
        config: CustomFieldConfig[],
    ): {
        [field: string]: string | boolean | string[] | undefined;
    };
    /**
     * Attempts to match a TaxCategory entity against the name supplied in the import table. If no matches
     * are found, the first TaxCategory id is returned.
     */
    private getMatchingTaxCategoryId;
    private getTranslationByCodeOrFirst;
}
