import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { MaterialInventoryService } from "../material-inventory.service.js";
import type {
  ChangeMaterialLotStatusInput,
  DiscardMaterialInventoryInput,
  ManualInMaterialInput,
  MaterialInventoryOperationPayload,
  TransferMaterialLocationInput,
} from "../../../../generated/graphql/types.js";

@Resolver()
export class MaterialInventoryMutationResolver {
  constructor(private readonly service: MaterialInventoryService) {}

  @Mutation("manualInMaterialInventory")
  async manualInMaterialInventory(
    @Args("input") input: ManualInMaterialInput,
    @Context() context: any,
  ): Promise<MaterialInventoryOperationPayload> {
    return this.service.manualIn(input, context);
  }

  @Mutation("transferMaterialLocation")
  async transferMaterialLocation(
    @Args("input") input: TransferMaterialLocationInput,
    @Context() context: any,
  ): Promise<MaterialInventoryOperationPayload> {
    return this.service.transferLocation(input, context);
  }

  @Mutation("changeMaterialLotStatus")
  async changeMaterialLotStatus(
    @Args("input") input: ChangeMaterialLotStatusInput,
    @Context() context: any,
  ): Promise<MaterialInventoryOperationPayload> {
    return this.service.changeStatus(input, context);
  }

  @Mutation("discardMaterialInventory")
  async discardMaterialInventory(
    @Args("input") input: DiscardMaterialInventoryInput,
    @Context() context: any,
  ): Promise<MaterialInventoryOperationPayload> {
    return this.service.discardInventory(input, context);
  }
}
