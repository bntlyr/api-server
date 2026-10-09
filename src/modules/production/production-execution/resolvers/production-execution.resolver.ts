import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import { ProductionExecutionService } from "../production-execution.service.js";
import type {
  ActiveWorkerDtrInfo,
  AssignProductionBoxInput,
  AssignProductionBoxPayload,
  BookProductionProcessInput,
  ProductionDtrPayload,
  ProductionProcessPayload,
  ReceiveProductionProcessInput,
  StartProductionDtrInput,
  StopProductionDtrInput,
  TransferProductionProcessInput,
} from "../../../../generated/graphql/types.js";

@Resolver()
export class ProductionExecutionResolver {
  constructor(private readonly executionService: ProductionExecutionService) {}

  @Query("activeWorkerDtrs")
  async activeWorkerDtrs(
    @Args("sectionId", { nullable: true }) sectionId?: number,
  ): Promise<ActiveWorkerDtrInfo[]> {
    return this.executionService.activeWorkerDtrs(sectionId);
  }

  @Mutation("receiveProductionProcess")
  async receiveProductionProcess(
    @Args("input") input: ReceiveProductionProcessInput,
    @Context() context: any,
  ): Promise<ProductionProcessPayload> {
    return this.executionService.receive(input, context);
  }

  @Mutation("startProductionDtr")
  async startProductionDtr(
    @Args("input") input: StartProductionDtrInput,
    @Context() context: any,
  ): Promise<ProductionDtrPayload> {
    return this.executionService.startDtr(input, context);
  }

  @Mutation("stopProductionDtr")
  async stopProductionDtr(
    @Args("input") input: StopProductionDtrInput,
    @Context() context: any,
  ): Promise<ProductionDtrPayload> {
    return this.executionService.stopDtr(input, context);
  }

  @Mutation("bookProductionProcess")
  async bookProductionProcess(
    @Args("input") input: BookProductionProcessInput,
    @Context() context: any,
  ): Promise<ProductionProcessPayload> {
    return this.executionService.book(input, context);
  }

  @Mutation("transferProductionProcess")
  async transferProductionProcess(
    @Args("input") input: TransferProductionProcessInput,
    @Context() context: any,
  ): Promise<ProductionProcessPayload> {
    return this.executionService.transfer(input, context);
  }

  @Mutation("assignProductionBox")
  async assignProductionBox(
    @Args("input") input: AssignProductionBoxInput,
    @Context() context: any,
  ): Promise<AssignProductionBoxPayload> {
    return this.executionService.assignBox(input, context);
  }

  @Mutation("notifyLeftRunningDtrs")
  async notifyLeftRunningDtrs(
    @Args("maxHoursRunning", { nullable: true }) maxHoursRunning: number | null,
    @Context() context: any,
  ) {
    return this.executionService.notifyLeftRunningDtrs(maxHoursRunning, context);
  }
}
