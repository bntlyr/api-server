import { Resolver } from "@nestjs/graphql";

@Resolver("User")
export class UserRelationResolver {
  /**
   * Field resolver / relation resolver for User.
   * Extend this with relations as the schema grows.
   */
}
