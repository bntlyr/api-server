import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { SectionService } from "../section.service.js";
import type {
  SectionFilterInput,
  PaginationInput,
  SectionConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("Section")
export class SectionQueryResolver {
  constructor(private readonly sectionService: SectionService) {}

  @Query("sectionById")
  async sectionById(@Args("id") id: string, @Context() context?: any) {
    return this.sectionService.findOne(id, context);
  }

  @Query("sectionsPaginated")
  async sectionsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: SectionFilterInput | null,
    @Context() context?: any,
  ): Promise<SectionConnection> {
    return this.sectionService.findMany(pagination, filter, context);
  }
}
