import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type { MouldItem as PrismaMouldItem } from "../../../../generated//prisma/client.js";
import { ItemLoader } from "../../item/item.loader.js";
import { MouldLoader } from "../../mould/mould.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("MouldItem")
export class MouldItemRelationResolver {
  constructor(
    private readonly mouldLoader: MouldLoader,
    private readonly itemLoader: ItemLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() mouldItem: PrismaMouldItem) {
    return resolveAuditEmployeeId(mouldItem.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() mouldItem: PrismaMouldItem) {
    return resolveAuditEmployeeId(mouldItem.updatedBy, this.userLoader);
  }

  @ResolveField("mould")
  async mould(@Parent() mouldItem: PrismaMouldItem) {
    if (!mouldItem.mouldId) return null;
    return this.mouldLoader.byId.load(mouldItem.mouldId);
  }

  @ResolveField("item")
  async item(@Parent() mouldItem: PrismaMouldItem) {
    if (!mouldItem.itemId) return null;
    return this.itemLoader.byId.load(mouldItem.itemId);
  }
}
