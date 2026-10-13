import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type { Mould as PrismaMould } from "../../../../generated//prisma/client.js";
import { MouldItemLoader } from "../../mould-item/mould-item.loader.js";
import { MouldTypeLoader } from "../../mould-type/mould-type.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("Mould")
export class MouldRelationResolver {
  constructor(
    private readonly mouldTypeLoader: MouldTypeLoader,
    private readonly mouldItemLoader: MouldItemLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() mould: PrismaMould) {
    return resolveAuditEmployeeId(mould.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() mould: PrismaMould) {
    return resolveAuditEmployeeId(mould.updatedBy, this.userLoader);
  }

  @ResolveField("mouldType")
  async mouldType(@Parent() mould: PrismaMould) {
    if (!mould.mouldTypeId) return null;
    return this.mouldTypeLoader.byId.load(mould.mouldTypeId);
  }

  @ResolveField("mouldItems")
  async mouldItems(@Parent() mould: PrismaMould) {
    return this.mouldItemLoader.byMouldId.load(mould.id);
  }
}
