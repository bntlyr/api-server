import { MouldItemLoader } from "../mould-item/mould-item.loader.js";
import { MouldTypeLoader } from "../mould-type/mould-type.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { MouldService } from "./mould.service.js";
import { MouldLoader } from "./mould.loader.js";
import { MouldQueryResolver } from "./resolvers/mould.query.js";
import { MouldMutationResolver } from "./resolvers/mould.mutation.js";
import { MouldRelationResolver } from "./resolvers/mould.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    MouldItemLoader,
    MouldTypeLoader,
    MouldLoader,
    MouldService,
    MouldQueryResolver,
    MouldMutationResolver,
    MouldRelationResolver,
  ],
  exports: [MouldService, MouldLoader],
})
export class MouldModule {}
