import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { UserLoader } from "../../../user/user.loader.js";
import type { Holiday as PrismaHoliday } from "../../../../generated/prisma/client.js";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("Holiday")
export class HolidayRelationResolver {
  constructor(private readonly userLoader: UserLoader) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() holiday: PrismaHoliday) {
    return resolveAuditEmployeeId(holiday.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() holiday: PrismaHoliday) {
    return resolveAuditEmployeeId(holiday.updatedBy, this.userLoader);
  }
}

