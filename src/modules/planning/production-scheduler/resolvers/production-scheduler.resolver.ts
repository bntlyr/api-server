import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import { ProductionSchedulerService } from "../production-scheduler.service.js";
import type {
  CreateProductionScheduleInput,
  CreateProductionSchedulePayload,
  ProductionSchedulePreview,
  ValidateProductionScheduleInput,
} from "../../../../generated/graphql/types.js";

@Resolver()
export class ProductionSchedulerResolver {
  constructor(private readonly schedulerService: ProductionSchedulerService) {}

  @Query("previewProductionSchedule")
  async previewProductionSchedule(
    @Args("input") input: ValidateProductionScheduleInput,
  ): Promise<ProductionSchedulePreview> {
    return this.schedulerService.preview(input);
  }

  @Mutation("createProductionSchedule")
  async createProductionSchedule(
    @Args("input") input: CreateProductionScheduleInput,
    @Context() context: any,
  ): Promise<CreateProductionSchedulePayload> {
    return this.schedulerService.createSchedule(input, context);
  }
}
