import { RawMaterialLoader } from "../../raw-material/raw-material.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import type { Melting as PrismaMelting } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("Melting")
export class MeltingRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rawMaterialLoader: RawMaterialLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() melting: PrismaMelting) {
    return resolveAuditEmployeeId(melting.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() melting: PrismaMelting) {
    return resolveAuditEmployeeId(melting.updatedBy, this.userLoader);
  }

  @ResolveField("rawMaterial")
  async rawMaterial(@Parent() melting: PrismaMelting) {
    if (!melting.rawMaterialId) return null;
    return this.rawMaterialLoader.byId.load(melting.rawMaterialId);
  }
}
