import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { StatusCodeService } from "../status-code.service.js";
import type {
  CreateStatusCodeInput,
  UpdateStatusCodeInput,
  StatusCodePayload,
} from "../../../generated/graphql/types.js";

@Resolver("StatusCode")
export class StatusCodeMutationResolver {
  constructor(private readonly statusCodeService: StatusCodeService) {}

  @Mutation("createStatusCode")
  async createStatusCode(
    @Args("input") input: CreateStatusCodeInput,
    @Context() context: any,
  ): Promise<StatusCodePayload> {
    return this.statusCodeService.create(input, context);
  }

  @Mutation("updateStatusCode")
  async updateStatusCode(
    @Args("id") id: string,
    @Args("input") input: UpdateStatusCodeInput,
    @Context() context: any,
  ): Promise<StatusCodePayload> {
    return this.statusCodeService.update(id, input, context);
  }

  @Mutation("deleteStatusCode")
  async deleteStatusCode(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<StatusCodePayload> {
    return this.statusCodeService.delete(id, context);
  }

  @Mutation("restoreStatusCode")
  async restoreStatusCode(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<StatusCodePayload> {
    return this.statusCodeService.restore(id, context);
  }
}
