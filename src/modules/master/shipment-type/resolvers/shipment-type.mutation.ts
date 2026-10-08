import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ShipmentTypeService } from "../shipment-type.service.js";
import type {
  CreateShipmentTypeInput,
  UpdateShipmentTypeInput,
  ShipmentTypePayload,
} from "../../../../generated//graphql/types.js";

@Resolver("ShipmentType")
export class ShipmentTypeMutationResolver {
  constructor(private readonly shipmentTypeService: ShipmentTypeService) {}

  @Mutation("createShipmentType")
  async createShipmentType(
    @Args("input") input: CreateShipmentTypeInput,
    @Context() context: any,
  ): Promise<ShipmentTypePayload> {
    return this.shipmentTypeService.create(input, context);
  }

  @Mutation("updateShipmentType")
  async updateShipmentType(
    @Args("id") id: string,
    @Args("input") input: UpdateShipmentTypeInput,
    @Context() context: any,
  ): Promise<ShipmentTypePayload> {
    return this.shipmentTypeService.update(id, input, context);
  }

  @Mutation("deleteShipmentType")
  async deleteShipmentType(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ShipmentTypePayload> {
    return this.shipmentTypeService.delete(id, context);
  }

  @Mutation("restoreShipmentType")
  async restoreShipmentType(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ShipmentTypePayload> {
    return this.shipmentTypeService.restore(id, context);
  }
}
