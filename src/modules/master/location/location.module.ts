import { AreaLoader } from "../area/area.loader.js";
import { UserLoader } from "../../user/user.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { LocationService } from "./location.service.js";
import { LocationLoader } from "./location.loader.js";
import { LocationQueryResolver } from "./resolvers/location.query.js";
import { LocationMutationResolver } from "./resolvers/location.mutation.js";
import { LocationRelationResolver } from "./resolvers/location.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    UserLoader,
    AreaLoader,
    LocationLoader,
    LocationService,
    LocationQueryResolver,
    LocationMutationResolver,
    LocationRelationResolver,
  ],
  exports: [LocationService, LocationLoader],
})
export class LocationModule {}
