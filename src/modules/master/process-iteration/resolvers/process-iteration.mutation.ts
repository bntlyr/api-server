import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ProcessIterationService } from "../process-iteration.service.js";
import type {
  CreateProcessIterationInput,
  UpdateProcessIterationInput,
  ProcessIterationPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("ProcessIteration")
export class ProcessIterationMutationResolver {
  constructor(private readonly processIterationService: ProcessIterationService) {}

  @Mutation("createProcessIteration")
  async createProcessIteration(
    @Args("input") input: CreateProcessIterationInput,
    @Context() context: any,
  ): Promise<ProcessIterationPayload> {
    return this.processIterationService.create(input, context);
  }

  @Mutation("updateProcessIteration")
  async updateProcessIteration(
    @Args("id") id: string,
    @Args("input") input: UpdateProcessIterationInput,
    @Context() context: any,
  ): Promise<ProcessIterationPayload> {
    return this.processIterationService.update(id, input, context);
  }

  @Mutation("deleteProcessIteration")
  async deleteProcessIteration(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ProcessIterationPayload> {
    return this.processIterationService.delete(id, context);
  }

  @Mutation("restoreProcessIteration")
  async restoreProcessIteration(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ProcessIterationPayload> {
    return this.processIterationService.restore(id, context);
  }
}
