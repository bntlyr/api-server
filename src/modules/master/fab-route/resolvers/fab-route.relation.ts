import { FabRouteStepLoader } from "../../fab-route-step/fab-route-step.loader.js";
import { FabricationLoader } from "../../fabrication/fabrication.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";
import type { FabRoute as PrismaFabRoute } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("FabRoute")
export class FabRouteRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabricationLoader: FabricationLoader,
    private readonly fabRouteStepLoader: FabRouteStepLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() fabRoute: PrismaFabRoute) {
    return resolveAuditEmployeeId(fabRoute.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() fabRoute: PrismaFabRoute) {
    return resolveAuditEmployeeId(fabRoute.updatedBy, this.userLoader);
  }

  @ResolveField("fabrication")
  async fabrication(@Parent() fabRoute: PrismaFabRoute) {
    if (!fabRoute.fabricationId) return null;
    return this.fabricationLoader.byId.load(fabRoute.fabricationId);
  }

  @ResolveField("fabRouteSteps")
  async fabRouteSteps(@Parent() fabRoute: PrismaFabRoute) {
    return this.fabRouteStepLoader.byFabRouteId.load(fabRoute.id);
  }
}
