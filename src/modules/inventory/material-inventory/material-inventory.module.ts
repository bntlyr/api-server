import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { AreaLoader } from "../../master/area/area.loader.js";
import { LocationLoader } from "../../master/location/location.loader.js";
import { MaterialLoader } from "../../master/material/material.loader.js";
import { SupplierLoader } from "../../master/supplier/supplier.loader.js";
import { MaterialInventoryLoader } from "./material-inventory.loader.js";
import { MaterialInventoryService } from "./material-inventory.service.js";
import { MaterialInventoryQueryResolver } from "./resolvers/material-inventory.query.js";
import { MaterialInventoryMutationResolver } from "./resolvers/material-inventory.mutation.js";
import {
  MaterialInventoryLotRelationResolver,
  MaterialInventoryTransactionRelationResolver,
  MaterialInventoryExtensionResolver,
} from "./resolvers/material-inventory.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    AreaLoader,
    LocationLoader,
    MaterialLoader,
    SupplierLoader,
    MaterialInventoryLoader,
    MaterialInventoryService,
    MaterialInventoryQueryResolver,
    MaterialInventoryMutationResolver,
    MaterialInventoryLotRelationResolver,
    MaterialInventoryTransactionRelationResolver,
    MaterialInventoryExtensionResolver,
  ],
  exports: [MaterialInventoryService, MaterialInventoryLoader],
})
export class MaterialInventoryModule {}
