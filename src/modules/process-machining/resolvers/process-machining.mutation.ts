import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ProcessMachiningService } from "../process-machining.service.js";
import type {
  CreateProcessMachiningInput,
  UpdateProcessMachiningInput,
  ProcessMachiningPayload,
} from "../../../generated/graphql/types.js";

@Resolver("ProcessMachining")
export class ProcessMachiningMutationResolver {
  constructor(private readonly processMachiningService: ProcessMachiningService) {}

  @Mutation("createProcessMachining")
  async createProcessMachining(
    @Args("input") input: CreateProcessMachiningInput,
    @Context() context: any,
  ): Promise<ProcessMachiningPayload> {
    return this.processMachiningService.create(input, context);
  }

  @Mutation("updateProcessMachining")
  async updateProcessMachining(
    @Args("id") id: string,
    @Args("input") input: UpdateProcessMachiningInput,
    @Context() context: any,
  ): Promise<ProcessMachiningPayload> {
    return this.processMachiningService.update(id, input, context);
  }

  @Mutation("deleteProcessMachining")
  async deleteProcessMachining(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ProcessMachiningPayload> {
    return this.processMachiningService.delete(id, context);
  }

  @Mutation("restoreProcessMachining")
  async restoreProcessMachining(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ProcessMachiningPayload> {
    return this.processMachiningService.restore(id, context);
  }
}
