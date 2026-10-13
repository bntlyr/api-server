import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { UserService } from "../user.service.js";
import type {
  UserFilterInput,
  PaginationInput,
  UserConnection,
} from "../../../generated/graphql/types.js";

@Resolver("User")
export class UserQueryResolver {
  constructor(private readonly userService: UserService) {}

  @Query("userById")
  async userById(@Args("id") id: string, @Context() context?: any) {
    return this.userService.findOne(id, context);
  }

  @Query("usersPaginated")
  async usersPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: UserFilterInput | null,
    @Context() context?: any,
  ): Promise<UserConnection> {
    return this.userService.findMany(pagination, filter, context);
  }
}
