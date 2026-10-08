import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { PalletTypeService } from "./pallet-type.service.js";
import { PalletTypeLoader } from "./pallet-type.loader.js";
import { PalletTypeQueryResolver } from "./resolvers/pallet-type.query.js";
import { PalletTypeMutationResolver } from "./resolvers/pallet-type.mutation.js";
import { PalletTypeRelationResolver } from "./resolvers/pallet-type.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    PalletTypeLoader,
    PalletTypeService,
    PalletTypeQueryResolver,
    PalletTypeMutationResolver,
    PalletTypeRelationResolver,
  ],
  exports: [PalletTypeService, PalletTypeLoader],
})
export class PalletTypeModule {}
