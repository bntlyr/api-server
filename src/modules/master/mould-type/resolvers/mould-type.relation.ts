import { MouldLoader } from "../../mould/mould.loader.js";
import { ItemTypeLoader } from "../../item-type/item-type.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import type { MouldType as PrismaMouldType } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("MouldType")
export class MouldTypeRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemTypeLoader: ItemTypeLoader,
    private readonly mouldLoader: MouldLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() mouldType: PrismaMouldType) {
    return resolveAuditEmployeeId(mouldType.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() mouldType: PrismaMouldType) {
    return resolveAuditEmployeeId(mouldType.updatedBy, this.userLoader);
  }

  @ResolveField("itemType")
  async itemType(@Parent() mouldType: PrismaMouldType) {
    if (!mouldType.itemTypeId) return null;
    return this.itemTypeLoader.byId.load(mouldType.itemTypeId);
  }

  @ResolveField("moulds")
  async moulds(@Parent() mouldType: PrismaMouldType) {
    return this.mouldLoader.byMouldTypeId.load(mouldType.id);
  }
}
