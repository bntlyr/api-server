import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { UserLoader } from "../../../user/user.loader.js";
import type { ShipmentType as PrismaShipmentType } from "../../../../generated/prisma/client.js";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("ShipmentType")
export class ShipmentTypeRelationResolver {
  constructor(private readonly userLoader: UserLoader) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() shipmentType: PrismaShipmentType) {
    return resolveAuditEmployeeId(shipmentType.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() shipmentType: PrismaShipmentType) {
    return resolveAuditEmployeeId(shipmentType.updatedBy, this.userLoader);
  }
}

