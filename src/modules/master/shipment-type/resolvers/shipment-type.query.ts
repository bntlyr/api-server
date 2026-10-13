import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { ShipmentTypeService } from "../shipment-type.service.js";
import type {
  ShipmentTypeFilterInput,
  PaginationInput,
  ShipmentTypeConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("ShipmentType")
export class ShipmentTypeQueryResolver {
  constructor(private readonly shipmentTypeService: ShipmentTypeService) {}

  @Query("shipmentTypeById")
  async shipmentTypeById(@Args("id") id: string, @Context() context?: any) {
    return this.shipmentTypeService.findOne(id, context);
  }

  @Query("shipmentTypesPaginated")
  async shipmentTypesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ShipmentTypeFilterInput | null,
    @Context() context?: any,
  ): Promise<ShipmentTypeConnection> {
    return this.shipmentTypeService.findMany(pagination, filter, context);
  }
}
