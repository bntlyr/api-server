import { ItemLoader } from "../item/item.loader.js";
import { UserLoader } from "../../user/user.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { BoxTypeService } from "./box-type.service.js";
import { BoxTypeLoader } from "./box-type.loader.js";
import { BoxTypeQueryResolver } from "./resolvers/box-type.query.js";
import { BoxTypeMutationResolver } from "./resolvers/box-type.mutation.js";
import { BoxTypeRelationResolver } from "./resolvers/box-type.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    UserLoader,
    ItemLoader,
    BoxTypeLoader,
    BoxTypeService,
    BoxTypeQueryResolver,
    BoxTypeMutationResolver,
    BoxTypeRelationResolver,
  ],
  exports: [BoxTypeService, BoxTypeLoader],
})
export class BoxTypeModule {}
