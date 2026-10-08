import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ParameterService } from "../parameter.service.js";
import type {
  CreateParameterInput,
  UpdateParameterInput,
  ParameterPayload,
} from "../../../generated/graphql/types.js";

@Resolver("Parameter")
export class ParameterMutationResolver {
  constructor(private readonly parameterService: ParameterService) {}

  @Mutation("createParameter")
  async createParameter(
    @Args("input") input: CreateParameterInput,
    @Context() context: any,
  ): Promise<ParameterPayload> {
    return this.parameterService.create(input, context);
  }

  @Mutation("updateParameter")
  async updateParameter(
    @Args("id") id: string,
    @Args("input") input: UpdateParameterInput,
    @Context() context: any,
  ): Promise<ParameterPayload> {
    return this.parameterService.update(id, input, context);
  }

  @Mutation("deleteParameter")
  async deleteParameter(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ParameterPayload> {
    return this.parameterService.delete(id, context);
  }

  @Mutation("restoreParameter")
  async restoreParameter(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ParameterPayload> {
    return this.parameterService.restore(id, context);
  }
}
