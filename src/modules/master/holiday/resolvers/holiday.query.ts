import { Args, Query, Resolver } from "@nestjs/graphql";
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
  async holidayById(@Args("id") id: string) {
    return this.holidayService.findOne(id);
  }

  @Query("holidaysPaginated")
  async holidaysPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: HolidayFilterInput | null,
  ): Promise<HolidayConnection> {
    return this.holidayService.findMany(pagination, filter);
  }
}
