import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ShipmentService } from "../shipment.service.js";
import type {
  AddBoxesToShipmentInput,
  CreateShipmentInput,
  ShipmentPayload,
  UpdateShipmentInput,
} from "../../../generated/graphql/types.js";

@Resolver("Shipment")
export class ShipmentMutationResolver {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Mutation("createShipment")
  async createShipment(
    @Args("input") input: CreateShipmentInput,
    @Context() context: any,
  ): Promise<ShipmentPayload> {
    return this.shipmentService.create(input, context);
  }

  @Mutation("updateShipment")
  async updateShipment(
    @Args("id") id: string,
    @Args("input") input: UpdateShipmentInput,
    @Context() context: any,
  ): Promise<ShipmentPayload> {
    return this.shipmentService.update(id, input, context);
  }

  @Mutation("deleteShipment")
  async deleteShipment(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ShipmentPayload> {
    return this.shipmentService.delete(id, context);
  }

  @Mutation("addBoxesToShipment")
  async addBoxesToShipment(
    @Args("input") input: AddBoxesToShipmentInput,
    @Context() context: any,
  ): Promise<ShipmentPayload> {
    return this.shipmentService.addBoxes(input, context);
  }

  @Mutation("reallocateShipmentBoxes")
  async reallocateShipmentBoxes(
    @Args("shipmentId") shipmentId: string,
    @Args("palletTypeId", { nullable: true }) palletTypeId?: number | null,
    @Args("force", { nullable: true }) force?: boolean | null,
    @Context() context?: any,
  ): Promise<ShipmentPayload> {
    return this.shipmentService.reallocate(shipmentId, palletTypeId, Boolean(force), context);
  }

  @Mutation("finalizeShipment")
  async finalizeShipment(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ShipmentPayload> {
    return this.shipmentService.finalize(id, context);
  }

  @Mutation("undoFinalizeShipment")
  async undoFinalizeShipment(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ShipmentPayload> {
    return this.shipmentService.undoFinalize(id, context);
  }

  @Mutation("shipOut")
  async shipOut(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ShipmentPayload> {
    return this.shipmentService.shipOut(id, context);
  }
}
