import { RawMaterialLoader } from "../raw-material/raw-material.loader.js";
import { UserLoader } from "../../user/user.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { RawMaterialRotationService } from "./raw-material-rotation.service.js";
import { RawMaterialRotationLoader } from "./raw-material-rotation.loader.js";
import { RawMaterialRotationQueryResolver } from "./resolvers/raw-material-rotation.query.js";
import { RawMaterialRotationMutationResolver } from "./resolvers/raw-material-rotation.mutation.js";
import { RawMaterialRotationRelationResolver } from "./resolvers/raw-material-rotation.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    UserLoader,
    RawMaterialLoader,
    RawMaterialRotationLoader,
    RawMaterialRotationService,
    RawMaterialRotationQueryResolver,
    RawMaterialRotationMutationResolver,
    RawMaterialRotationRelationResolver,
  ],
  exports: [RawMaterialRotationService, RawMaterialRotationLoader],
})
export class RawMaterialRotationModule {}
