import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import { ProductionSchedulerService } from "../production-scheduler.service.js";
import type {
  CreateProductionScheduleInput,
  CreateProductionSchedulePayload,
  CreateRemakeScheduleInput,
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

  @Query("previewRemakeSchedule")
  async previewRemakeSchedule(
    @Args("input") input: CreateRemakeScheduleInput,
  ): Promise<ProductionSchedulePreview> {
    return this.schedulerService.previewRemakeSchedule(input);
  }

  @Mutation("createProductionSchedule")
  async createProductionSchedule(
    @Args("input") input: CreateProductionScheduleInput,
    @Context() context: any,
  ): Promise<CreateProductionSchedulePayload> {
    return this.schedulerService.createSchedule(input, context);
  }

  @Mutation("createRemakeSchedule")
  async createRemakeSchedule(
    @Args("input") input: CreateRemakeScheduleInput,
    @Context() context: any,
  ): Promise<CreateProductionSchedulePayload> {
    return this.schedulerService.createRemakeSchedule(input, context);
  }
}
