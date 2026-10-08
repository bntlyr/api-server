import { FabRouteLoader } from "../fab-route/fab-route.loader.js";
import { ItemLoader } from "../item/item.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { FabricationService } from "./fabrication.service.js";
import { FabricationLoader } from "./fabrication.loader.js";
import { FabricationQueryResolver } from "./resolvers/fabrication.query.js";
import { FabricationMutationResolver } from "./resolvers/fabrication.mutation.js";
import { FabricationRelationResolver } from "./resolvers/fabrication.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    FabRouteLoader,
    ItemLoader,
    FabricationLoader,
    FabricationService,
    FabricationQueryResolver,
    FabricationMutationResolver,
    FabricationRelationResolver,
  ],
  exports: [FabricationService, FabricationLoader],
})
export class FabricationModule {}
