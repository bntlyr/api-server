import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { MouldItemService } from "./mould-item.service.js";
import { MouldItemLoader } from "./mould-item.loader.js";
import { MouldItemQueryResolver } from "./resolvers/mould-item.query.js";
import { MouldItemMutationResolver } from "./resolvers/mould-item.mutation.js";
import { MouldItemRelationResolver } from "./resolvers/mould-item.relation.js";

import { MouldModule } from "../mould/mould.module.js";
import { ItemModule } from "../item/item.module.js";
import { UserLoader } from "../../user/user.loader.js";

@Module({
  imports: [PrismaModule, MouldModule, ItemModule],
  providers: [
    UserLoader,
    MouldItemLoader,
    MouldItemService,
    MouldItemQueryResolver,
    MouldItemMutationResolver,
    MouldItemRelationResolver,
  ],
  exports: [MouldItemService, MouldItemLoader],
})
export class MouldItemModule {}
