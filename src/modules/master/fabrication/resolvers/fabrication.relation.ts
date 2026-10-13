import { FabRouteLoader } from "../../fab-route/fab-route.loader.js";
import { ItemLoader } from "../../item/item.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";
import type { Fabrication as PrismaFabrication } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("Fabrication")
export class FabricationRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemLoader: ItemLoader,
    private readonly fabRouteLoader: FabRouteLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() fabrication: PrismaFabrication) {
    return resolveAuditEmployeeId(fabrication.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() fabrication: PrismaFabrication) {
    return resolveAuditEmployeeId(fabrication.updatedBy, this.userLoader);
  }

  @ResolveField("item")
  async item(@Parent() fabrication: PrismaFabrication) {
    if (!fabrication.itemId) return null;
    return this.itemLoader.byId.load(fabrication.itemId);
  }

  @ResolveField("fabRoutes")
  async fabRoutes(@Parent() fabrication: PrismaFabrication) {
    return this.fabRouteLoader.byFabricationId.load(fabrication.id);
  }
}
