import { Args, Query, Resolver } from "@nestjs/graphql";
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
  async sectionById(@Args("id") id: string) {
    return this.sectionService.findOne(id);
  }

  @Query("sectionsPaginated")
  async sectionsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: SectionFilterInput | null,
  ): Promise<SectionConnection> {
    return this.sectionService.findMany(pagination, filter);
  }
}
