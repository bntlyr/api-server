import { RawMaterialLoader } from "../../raw-material/raw-material.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import type { RawMaterialRotation as PrismaRawMaterialRotation } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("RawMaterialRotation")
export class RawMaterialRotationRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rawMaterialLoader: RawMaterialLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() rawMaterialRotation: PrismaRawMaterialRotation) {
    return resolveAuditEmployeeId(rawMaterialRotation.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() rawMaterialRotation: PrismaRawMaterialRotation) {
    return resolveAuditEmployeeId(rawMaterialRotation.updatedBy, this.userLoader);
  }

  @ResolveField("rawMaterial")
  async rawMaterial(@Parent() rawMaterialRotation: PrismaRawMaterialRotation) {
    if (!rawMaterialRotation.rawMaterialId) return null;
    return this.rawMaterialLoader.byId.load(rawMaterialRotation.rawMaterialId);
  }
}
