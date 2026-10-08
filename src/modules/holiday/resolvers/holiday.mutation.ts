import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { HolidayService } from "../holiday.service.js";
import type {
  CreateHolidayInput,
  UpdateHolidayInput,
  HolidayPayload,
} from "../../../generated/graphql/types.js";

@Resolver("Holiday")
export class HolidayMutationResolver {
  constructor(private readonly holidayService: HolidayService) {}

  @Mutation("createHoliday")
  async createHoliday(
    @Args("input") input: CreateHolidayInput,
    @Context() context: any,
  ): Promise<HolidayPayload> {
    return this.holidayService.create(input, context);
  }

  @Mutation("updateHoliday")
  async updateHoliday(
    @Args("id") id: string,
    @Args("input") input: UpdateHolidayInput,
    @Context() context: any,
  ): Promise<HolidayPayload> {
    return this.holidayService.update(id, input, context);
  }

  @Mutation("deleteHoliday")
  async deleteHoliday(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<HolidayPayload> {
    return this.holidayService.delete(id, context);
  }

  @Mutation("restoreHoliday")
  async restoreHoliday(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<HolidayPayload> {
    return this.holidayService.restore(id, context);
  }
}
