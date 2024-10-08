import {
    DeletionResponse,
    MutationAssignFacetsToChannelArgs,
    MutationCreateFacetArgs,
    MutationCreateFacetValuesArgs,
    MutationDeleteFacetArgs,
    MutationDeleteFacetsArgs,
    MutationDeleteFacetValuesArgs,
    MutationRemoveFacetsFromChannelArgs,
    MutationUpdateFacetArgs,
    MutationUpdateFacetValuesArgs,
    QueryFacetArgs,
    QueryFacetsArgs,
    QueryFacetValuesArgs,
    RemoveFacetFromChannelResult,
} from '@vendure/common/lib/generated-types';
import { PaginatedList } from '@vendure/common/lib/shared-types';
import { ErrorResultUnion } from '../../../common/error/error-result';
import { Translated } from '../../../common/types/locale-types';
import { ConfigService } from '../../../config/config.service';
import { Facet } from '../../../entity/facet/facet.entity';
import { FacetValue } from '../../../entity/facet-value/facet-value.entity';
import { FacetValueService } from '../../../service/services/facet-value.service';
import { FacetService } from '../../../service/services/facet.service';
import { RequestContext } from '../../common/request-context';
import { RelationPaths } from '../../decorators/relations.decorator';
export declare class FacetResolver {
    private facetService;
    private facetValueService;
    private configService;
    constructor(
        facetService: FacetService,
        facetValueService: FacetValueService,
        configService: ConfigService,
    );
    facets(
        ctx: RequestContext,
        args: QueryFacetsArgs,
        relations: RelationPaths<Facet>,
    ): Promise<PaginatedList<Translated<Facet>>>;
    facet(
        ctx: RequestContext,
        args: QueryFacetArgs,
        relations: RelationPaths<Facet>,
    ): Promise<Translated<Facet> | undefined>;
    facetValues(
        ctx: RequestContext,
        args: QueryFacetValuesArgs,
        relations: RelationPaths<FacetValue>,
    ): Promise<PaginatedList<Translated<FacetValue>>>;
    createFacet(ctx: RequestContext, args: MutationCreateFacetArgs): Promise<Translated<Facet>>;
    updateFacet(ctx: RequestContext, args: MutationUpdateFacetArgs): Promise<Translated<Facet>>;
    deleteFacet(ctx: RequestContext, args: MutationDeleteFacetArgs): Promise<DeletionResponse>;
    deleteFacets(ctx: RequestContext, args: MutationDeleteFacetsArgs): Promise<DeletionResponse[]>;
    createFacetValues(
        ctx: RequestContext,
        args: MutationCreateFacetValuesArgs,
    ): Promise<Array<Translated<FacetValue>>>;
    updateFacetValues(
        ctx: RequestContext,
        args: MutationUpdateFacetValuesArgs,
    ): Promise<Array<Translated<FacetValue>>>;
    deleteFacetValues(ctx: RequestContext, args: MutationDeleteFacetValuesArgs): Promise<DeletionResponse[]>;
    assignFacetsToChannel(ctx: RequestContext, args: MutationAssignFacetsToChannelArgs): Promise<Facet[]>;
    removeFacetsFromChannel(
        ctx: RequestContext,
        args: MutationRemoveFacetsFromChannelArgs,
    ): Promise<Array<ErrorResultUnion<RemoveFacetFromChannelResult, Facet>>>;
}
