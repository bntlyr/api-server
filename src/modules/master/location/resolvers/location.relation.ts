import { AreaLoader } from "../../area/area.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import type { Location as PrismaLocation } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("Location")
export class LocationRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly areaLoader: AreaLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() location: PrismaLocation) {
    return resolveAuditEmployeeId(location.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() location: PrismaLocation) {
    return resolveAuditEmployeeId(location.updatedBy, this.userLoader);
  }

  @ResolveField("area")
  async area(@Parent() location: PrismaLocation) {
    if (!location.areaId) return null;
    return this.areaLoader.byId.load(location.areaId);
  }
}
