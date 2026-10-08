import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ProcessService } from "../process.service.js";
import type {
  CreateProcessInput,
  UpdateProcessInput,
  ProcessPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("Process")
export class ProcessMutationResolver {
  constructor(private readonly processService: ProcessService) {}

  @Mutation("createProcess")
  async createProcess(
    @Args("input") input: CreateProcessInput,
    @Context() context: any,
  ): Promise<ProcessPayload> {
    return this.processService.create(input, context);
  }

  @Mutation("updateProcess")
  async updateProcess(
    @Args("id") id: string,
    @Args("input") input: UpdateProcessInput,
    @Context() context: any,
  ): Promise<ProcessPayload> {
    return this.processService.update(id, input, context);
  }

  @Mutation("deleteProcess")
  async deleteProcess(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ProcessPayload> {
    return this.processService.delete(id, context);
  }

  @Mutation("restoreProcess")
  async restoreProcess(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ProcessPayload> {
    return this.processService.restore(id, context);
  }
}
