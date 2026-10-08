import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type { Mould as PrismaMould } from "../../../generated/prisma/client.js";
import { MouldItemLoader } from "../../mould-item/mould-item.loader.js";
import { MouldTypeLoader } from "../../mould-type/mould-type.loader.js";

@Resolver("Mould")
export class MouldRelationResolver {
  constructor(
    private readonly mouldTypeLoader: MouldTypeLoader,
    private readonly mouldItemLoader: MouldItemLoader,
  ) {}

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
