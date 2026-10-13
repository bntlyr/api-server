import { MouldLoader } from "../mould/mould.loader.js";
import { ItemTypeLoader } from "../item-type/item-type.loader.js";
import { UserLoader } from "../../user/user.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { MouldTypeService } from "./mould-type.service.js";
import { MouldTypeLoader } from "./mould-type.loader.js";
import { MouldTypeQueryResolver } from "./resolvers/mould-type.query.js";
import { MouldTypeMutationResolver } from "./resolvers/mould-type.mutation.js";
import { MouldTypeRelationResolver } from "./resolvers/mould-type.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    UserLoader,
    MouldLoader,
    ItemTypeLoader,
    MouldTypeLoader,
    MouldTypeService,
    MouldTypeQueryResolver,
    MouldTypeMutationResolver,
    MouldTypeRelationResolver,
  ],
  exports: [MouldTypeService, MouldTypeLoader],
})
export class MouldTypeModule {}
