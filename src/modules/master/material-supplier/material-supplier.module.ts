import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { MaterialSupplierService } from "./material-supplier.service.js";
import { MaterialSupplierLoader } from "./material-supplier.loader.js";
import { MaterialSupplierQueryResolver } from "./resolvers/material-supplier.query.js";
import { MaterialSupplierMutationResolver } from "./resolvers/material-supplier.mutation.js";
import { MaterialSupplierRelationResolver } from "./resolvers/material-supplier.relation.js";

import { MaterialModule } from "../material/material.module.js";
import { SupplierModule } from "../supplier/supplier.module.js";

@Module({
  imports: [PrismaModule, MaterialModule, SupplierModule],
  providers: [
    MaterialSupplierLoader,
    MaterialSupplierService,
    MaterialSupplierQueryResolver,
    MaterialSupplierMutationResolver,
    MaterialSupplierRelationResolver,
  ],
  exports: [MaterialSupplierService, MaterialSupplierLoader],
})
export class MaterialSupplierModule {}
