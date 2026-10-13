import { LocationLoader } from "../../location/location.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import type { Area as PrismaArea } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("Area")
export class AreaRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationLoader: LocationLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() area: PrismaArea) {
    return resolveAuditEmployeeId(area.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() area: PrismaArea) {
    return resolveAuditEmployeeId(area.updatedBy, this.userLoader);
  }

  @ResolveField("locations")
  async locations(@Parent() area: PrismaArea) {
    return this.locationLoader.byAreaId.load(area.id);
  }
}
