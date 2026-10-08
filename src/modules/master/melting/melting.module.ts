import { RawMaterialLoader } from "../raw-material/raw-material.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { MeltingService } from "./melting.service.js";
import { MeltingLoader } from "./melting.loader.js";
import { MeltingQueryResolver } from "./resolvers/melting.query.js";
import { MeltingMutationResolver } from "./resolvers/melting.mutation.js";
import { MeltingRelationResolver } from "./resolvers/melting.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    RawMaterialLoader,
    MeltingLoader,
    MeltingService,
    MeltingQueryResolver,
    MeltingMutationResolver,
    MeltingRelationResolver,
  ],
  exports: [MeltingService, MeltingLoader],
})
export class MeltingModule {}
