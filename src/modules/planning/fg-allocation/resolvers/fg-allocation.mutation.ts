import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { FinishedGoodsAllocationService } from "../fg-allocation.service.js";
import type {
  SubmitFgAllocationsInput,
  SubmitFgAllocationsPayload,
  FinishedGoodsAllocationRequestPayload,
} from "../../../../generated/graphql/types.js";

@Resolver("FinishedGoodsAllocationRequest")
export class FinishedGoodsAllocationMutationResolver {
  constructor(private readonly service: FinishedGoodsAllocationService) {}

  @Mutation("submitFgAllocations")
  async submitFgAllocations(
    @Args("input") input: SubmitFgAllocationsInput,
    @Context() context: any,
  ): Promise<SubmitFgAllocationsPayload> {
    return this.service.submitFgAllocations(input, context);
  }

  @Mutation("approveFinishedGoodsAllocationRequest")
  async approveFinishedGoodsAllocationRequest(
    @Args("id") id: string,
    @Args("destinationAreaId") destinationAreaId: number,
    @Args("destinationLocationId") destinationLocationId: number,
    @Args("remarks", { nullable: true }) remarks?: string | null,
    @Context() context?: any,
  ): Promise<FinishedGoodsAllocationRequestPayload> {
    return this.service.approveFinishedGoodsAllocationRequest(
      id,
      destinationAreaId,
      destinationLocationId,
      remarks,
      context,
    );
  }

  @Mutation("rejectFinishedGoodsAllocationRequest")
  async rejectFinishedGoodsAllocationRequest(
    @Args("id") id: string,
    @Args("reason") reason: string,
    @Context() context: any,
  ): Promise<FinishedGoodsAllocationRequestPayload> {
    return this.service.rejectFinishedGoodsAllocationRequest(id, reason, context);
  }

  @Mutation("cancelFinishedGoodsAllocationRequest")
  async cancelFinishedGoodsAllocationRequest(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FinishedGoodsAllocationRequestPayload> {
    return this.service.cancelFinishedGoodsAllocationRequest(id, context);
  }
}
