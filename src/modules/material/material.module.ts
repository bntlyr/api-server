import { MaterialSupplierLoader } from "../material-supplier/material-supplier.loader.js";
import { RawMaterialLoader } from "../raw-material/raw-material.loader.js";
import { SectionLoader } from "../section/section.loader.js";
import { MaterialGroupLoader } from "../material-group/material-group.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { MaterialService } from "./material.service.js";
import { MaterialLoader } from "./material.loader.js";
import { MaterialQueryResolver } from "./resolvers/material.query.js";
import { MaterialMutationResolver } from "./resolvers/material.mutation.js";
import { MaterialRelationResolver } from "./resolvers/material.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    MaterialSupplierLoader,
    RawMaterialLoader,
    SectionLoader,
    MaterialGroupLoader,
    MaterialLoader,
    MaterialService,
    MaterialQueryResolver,
    MaterialMutationResolver,
    MaterialRelationResolver,
  ],
  exports: [MaterialService, MaterialLoader],
})
export class MaterialModule {}
