import { ItemLoader } from "../../item/item.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";
import type { ItemRevision as PrismaItemRevision } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("ItemRevision")
export class ItemRevisionRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemLoader: ItemLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() itemRevision: PrismaItemRevision) {
    return resolveAuditEmployeeId(itemRevision.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() itemRevision: PrismaItemRevision) {
    return resolveAuditEmployeeId(itemRevision.updatedBy, this.userLoader);
  }

  @ResolveField("item")
  async item(@Parent() itemRevision: PrismaItemRevision) {
    if (!itemRevision.itemId) return null;
    return this.itemLoader.byId.load(itemRevision.itemId);
  }
}
