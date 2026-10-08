import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { UserService } from "../user.service.js";
import type {
  CreateUserInput,
  UpdateUserInput,
  UserPayload,
} from "../../../generated/graphql/types.js";

@Resolver("User")
export class UserMutationResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation("createUser")
  async createUser(
    @Args("input") input: CreateUserInput,
    @Context() context: any,
  ): Promise<UserPayload> {
    return this.userService.create(input, context);
  }

  @Mutation("updateUser")
  async updateUser(
    @Args("id") id: string,
    @Args("input") input: UpdateUserInput,
    @Context() context: any,
  ): Promise<UserPayload> {
    return this.userService.update(id, input, context);
  }

  @Mutation("deleteUser")
  async deleteUser(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<UserPayload> {
    return this.userService.delete(id, context);
  }

  @Mutation("restoreUser")
  async restoreUser(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<UserPayload> {
    return this.userService.restore(id, context);
  }
}
