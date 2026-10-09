import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { PrismaService } from "../../../../prisma/prisma.service.js";
import type { BoxContainer } from "../../../../generated/graphql/types.js";

@Resolver("BoxContainer")
export class BoxContainerRelationResolver {
  constructor(private readonly prisma: PrismaService) {}

  @ResolveField("salesOrder")
  async salesOrder(@Parent() boxContainer: BoxContainer) {
    if (!boxContainer.salesOrderId) return null;
    return this.prisma.salesOrder.findUnique({
      where: { id: boxContainer.salesOrderId },
    });
  }

  @ResolveField("boxType")
  async boxType(@Parent() boxContainer: BoxContainer) {
    return this.prisma.boxType.findUnique({
      where: { id: boxContainer.boxTypeId },
    });
  }

  @ResolveField("area")
  async area(@Parent() boxContainer: BoxContainer) {
    return this.prisma.area.findUnique({
      where: { id: boxContainer.areaId },
    });
  }

  @ResolveField("location")
  async location(@Parent() boxContainer: BoxContainer) {
    return this.prisma.location.findUnique({
      where: { id: boxContainer.locationId },
    });
  }

  @ResolveField("items")
  async items(@Parent() boxContainer: BoxContainer) {
    return this.prisma.boxContainerItem.findMany({
      where: { boxContainerId: Number(boxContainer.id), deleted: false },
    });
  }
}
