import { CustomerLoader } from "../../master/customer/customer.loader.js";
import { SupplierLoader } from "../../master/supplier/supplier.loader.js";
import { UserLoader } from "../../user/user.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { StatusCodeService } from "./status-code.service.js";
import { StatusCodeLoader } from "./status-code.loader.js";
import { StatusCodeQueryResolver } from "./resolvers/status-code.query.js";
import { StatusCodeMutationResolver } from "./resolvers/status-code.mutation.js";
import { StatusCodeRelationResolver } from "./resolvers/status-code.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    CustomerLoader,
    SupplierLoader,
    UserLoader,
    StatusCodeLoader,
    StatusCodeService,
    StatusCodeQueryResolver,
    StatusCodeMutationResolver,
    StatusCodeRelationResolver,
  ],
  exports: [StatusCodeService, StatusCodeLoader],
})
export class StatusCodeModule {}
