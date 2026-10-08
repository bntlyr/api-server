import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { FinishedGoodsInventoryService } from "../finished-goods-inventory.service.js";
import type {
  BatchFinishedGoodsPayload,
  BatchManualInFinishedGoodsInput,
  BatchMoveFinishedGoodsInput,
  ChangeFinishedGoodsStatusInput,
  DiscardFinishedGoodsInput,
  FinishedGoodsLotPayload,
  ManualInFinishedGoodsInput,
  ManualOutFinishedGoodsInput,
  MoveFinishedGoodsInput,
  PrintFinishedGoodsStickerInput,
  UpdateFinishedGoodsBoxTypeInput,
} from "../../../../generated/graphql/types.js";

@Resolver()
export class FinishedGoodsInventoryMutationResolver {
  constructor(private readonly service: FinishedGoodsInventoryService) {}

  @Mutation("manualInFinishedGoods")
  async manualInFinishedGoods(
    @Args("input") input: ManualInFinishedGoodsInput,
    @Context() context: any,
  ): Promise<FinishedGoodsLotPayload> {
    return this.service.manualIn(input, context);
  }

  @Mutation("batchManualInFinishedGoods")
  async batchManualInFinishedGoods(
    @Args("input") input: BatchManualInFinishedGoodsInput,
    @Context() context: any,
  ): Promise<BatchFinishedGoodsPayload> {
    return this.service.batchManualIn(input, context);
  }

  @Mutation("changeFinishedGoodsStatus")
  async changeFinishedGoodsStatus(
    @Args("input") input: ChangeFinishedGoodsStatusInput,
    @Context() context: any,
  ): Promise<FinishedGoodsLotPayload> {
    return this.service.changeStatus(input, context);
  }

  @Mutation("manualOutFinishedGoods")
  async manualOutFinishedGoods(
    @Args("input") input: ManualOutFinishedGoodsInput,
    @Context() context: any,
  ): Promise<FinishedGoodsLotPayload> {
    return this.service.manualOut(input, context);
  }

  @Mutation("discardFinishedGoods")
  async discardFinishedGoods(
    @Args("input") input: DiscardFinishedGoodsInput,
    @Context() context: any,
  ): Promise<FinishedGoodsLotPayload> {
    return this.service.discard(input, context);
  }

  @Mutation("moveFinishedGoods")
  async moveFinishedGoods(
    @Args("input") input: MoveFinishedGoodsInput,
    @Context() context: any,
  ): Promise<FinishedGoodsLotPayload> {
    return this.service.move(input, context);
  }

  @Mutation("batchMoveFinishedGoods")
  async batchMoveFinishedGoods(
    @Args("input") input: BatchMoveFinishedGoodsInput,
    @Context() context: any,
  ): Promise<BatchFinishedGoodsPayload> {
    return this.service.batchMove(input, context);
  }

  @Mutation("updateFinishedGoodsBoxType")
  async updateFinishedGoodsBoxType(
    @Args("input") input: UpdateFinishedGoodsBoxTypeInput,
    @Context() context: any,
  ): Promise<FinishedGoodsLotPayload> {
    return this.service.updateBoxType(input, context);
  }

  @Mutation("printFinishedGoodsSticker")
  async printFinishedGoodsSticker(
    @Args("input") input: PrintFinishedGoodsStickerInput,
    @Context() context: any,
  ): Promise<FinishedGoodsLotPayload> {
    return this.service.printSticker(input, context);
  }
}
