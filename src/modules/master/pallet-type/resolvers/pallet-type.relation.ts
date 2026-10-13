import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { UserLoader } from "../../../user/user.loader.js";
import type { PalletType as PrismaPalletType } from "../../../../generated/prisma/client.js";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("PalletType")
export class PalletTypeRelationResolver {
  constructor(private readonly userLoader: UserLoader) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() palletType: PrismaPalletType) {
    return resolveAuditEmployeeId(palletType.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() palletType: PrismaPalletType) {
    return resolveAuditEmployeeId(palletType.updatedBy, this.userLoader);
  }
}

