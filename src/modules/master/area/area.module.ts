import { LocationLoader } from "../location/location.loader.js";
import { UserLoader } from "../../user/user.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { AreaService } from "./area.service.js";
import { AreaLoader } from "./area.loader.js";
import { AreaQueryResolver } from "./resolvers/area.query.js";
import { AreaMutationResolver } from "./resolvers/area.mutation.js";
import { AreaRelationResolver } from "./resolvers/area.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    UserLoader,
    LocationLoader,
    AreaLoader,
    AreaService,
    AreaQueryResolver,
    AreaMutationResolver,
    AreaRelationResolver,
  ],
  exports: [AreaService, AreaLoader],
})
export class AreaModule {}
