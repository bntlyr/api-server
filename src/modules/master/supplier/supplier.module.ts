import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { SupplierService } from "./supplier.service.js";
import { SupplierLoader } from "./supplier.loader.js";
import { SupplierQueryResolver } from "./resolvers/supplier.query.js";
import { SupplierMutationResolver } from "./resolvers/supplier.mutation.js";
import { SupplierRelationResolver } from "./resolvers/supplier.relation.js";

import { StatusCodeLoader } from "../../common/status-code/status-code.loader.js";
import { MaterialSupplierLoader } from "../material-supplier/material-supplier.loader.js";
import { UserLoader } from "../../user/user.loader.js";

@Module({
  imports: [PrismaModule],
  providers: [
    UserLoader,
    StatusCodeLoader,
    MaterialSupplierLoader,
    SupplierLoader,
    SupplierService,
    SupplierQueryResolver,
    SupplierMutationResolver,
    SupplierRelationResolver,
  ],
  exports: [SupplierService, SupplierLoader],
})
export class SupplierModule {}
