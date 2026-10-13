import { MaterialLoader } from "../../material/material.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import type { MaterialGroup as PrismaMaterialGroup } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("MaterialGroup")
export class MaterialGroupRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly materialLoader: MaterialLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() materialGroup: PrismaMaterialGroup) {
    return resolveAuditEmployeeId(materialGroup.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() materialGroup: PrismaMaterialGroup) {
    return resolveAuditEmployeeId(materialGroup.updatedBy, this.userLoader);
  }

  @ResolveField("materials")
  async materials(@Parent() materialGroup: PrismaMaterialGroup) {
    return this.materialLoader.byMaterialGroupId.load(materialGroup.id);
  }
}
