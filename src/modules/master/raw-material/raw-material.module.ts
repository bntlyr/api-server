import { ItemLoader } from "../item/item.loader.js";
import { MaterialLoader } from "../material/material.loader.js";
import { MeltingLoader } from "../melting/melting.loader.js";
import { RawMaterialRotationLoader } from "../raw-material-rotation/raw-material-rotation.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { RawMaterialService } from "./raw-material.service.js";
import { RawMaterialLoader } from "./raw-material.loader.js";
import { RawMaterialQueryResolver } from "./resolvers/raw-material.query.js";
import { RawMaterialMutationResolver } from "./resolvers/raw-material.mutation.js";
import { RawMaterialRelationResolver } from "./resolvers/raw-material.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ItemLoader,
    MaterialLoader,
    MeltingLoader,
    RawMaterialRotationLoader,
    RawMaterialLoader,
    RawMaterialService,
    RawMaterialQueryResolver,
    RawMaterialMutationResolver,
    RawMaterialRelationResolver,
  ],
  exports: [RawMaterialService, RawMaterialLoader],
})
export class RawMaterialModule {}
