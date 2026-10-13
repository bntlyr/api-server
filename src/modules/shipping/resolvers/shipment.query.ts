import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { ShipmentService } from "../shipment.service.js";
import { PalletContainerService } from "../pallet-container.service.js";
import type {
  PaginationInput,
  ShipmentConnection,
  ShipmentFilterInput,
} from "../../../generated/graphql/types.js";

@Resolver("Shipment")
export class ShipmentQueryResolver {
  constructor(
    private readonly shipmentService: ShipmentService,
    private readonly palletContainerService: PalletContainerService,
  ) {}

  @Query("shipmentById")
  async shipmentById(@Args("id") id: string, @Context() context?: any) {
    return this.shipmentService.findOne(id, context);
  }

  @Query("shipmentsPaginated")
  async shipmentsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ShipmentFilterInput | null,
    @Context() context?: any,
  ): Promise<ShipmentConnection> {
    return this.shipmentService.findMany(pagination, filter, context);
  }

  @Query("palletContainerById")
  async palletContainerById(@Args("id") id: string, @Context() context?: any) {
    return this.palletContainerService.findOne(id, context);
  }

  @Query("eligibleBoxContainersForShipping")
  async eligibleBoxContainersForShipping(
    @Args("customerId", { nullable: true }) customerId?: number | null,
    @Args("salesOrderIds", { nullable: true }) salesOrderIds?: number[] | null,
    @Args("search", { nullable: true }) search?: string | null,
  ) {
    return this.shipmentService.findEligibleBoxes(customerId, salesOrderIds, search);
  }

  @Query("eligibleSalesOrdersForShipping")
  async eligibleSalesOrdersForShipping(
    @Args("customerId", { nullable: true }) customerId?: number | null,
    @Args("search", { nullable: true }) search?: string | null,
  ) {
    return this.shipmentService.findEligibleSalesOrders(customerId, search);
  }
}
