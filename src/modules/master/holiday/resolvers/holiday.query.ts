import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { HolidayService } from "../holiday.service.js";
import type {
  HolidayFilterInput,
  PaginationInput,
  HolidayConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("Holiday")
export class HolidayQueryResolver {
  constructor(private readonly holidayService: HolidayService) {}

  @Query("holidayById")
  async holidayById(@Args("id") id: string, @Context() context?: any) {
    return this.holidayService.findOne(id, context);
  }

  @Query("holidaysPaginated")
  async holidaysPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: HolidayFilterInput | null,
    @Context() context?: any,
  ): Promise<HolidayConnection> {
    return this.holidayService.findMany(pagination, filter, context);
  }
}
