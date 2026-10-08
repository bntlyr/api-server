import { PositionLoader } from "../master/position/position.loader.js";
import { SectionLoader } from "../master/section/section.loader.js";
import { StatusCodeLoader } from "../common/status-code/status-code.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { AuthModule } from "../../auth/auth.module.js";
import { UserService } from "./user.service.js";
import { UserLoader } from "./user.loader.js";
import { UserQueryResolver } from "./resolvers/user.query.js";
import { UserMutationResolver } from "./resolvers/user.mutation.js";
import { UserRelationResolver } from "./resolvers/user.relation.js";

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [
    PositionLoader,
    SectionLoader,
    StatusCodeLoader,
    UserLoader,
    UserService,
    UserQueryResolver,
    UserMutationResolver,
    UserRelationResolver,
  ],
  exports: [UserService, UserLoader],
})
export class UserModule {}
