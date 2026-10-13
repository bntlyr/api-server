import { ItemLoader } from "../../item/item.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import type { BoxType as PrismaBoxType } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("BoxType")
export class BoxTypeRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemLoader: ItemLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() boxType: PrismaBoxType) {
    return resolveAuditEmployeeId(boxType.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() boxType: PrismaBoxType) {
    return resolveAuditEmployeeId(boxType.updatedBy, this.userLoader);
  }

  @ResolveField("items")
  async items(@Parent() boxType: PrismaBoxType) {
    return this.itemLoader.byBoxTypeId.load(boxType.id);
  }
}
