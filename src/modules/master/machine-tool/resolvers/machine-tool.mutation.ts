import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { MachineToolService } from "../machine-tool.service.js";
import type {
  CreateMachineToolInput,
  UpdateMachineToolInput,
  MachineToolPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("MachineTool")
export class MachineToolMutationResolver {
  constructor(private readonly machineToolService: MachineToolService) {}

  @Mutation("createMachineTool")
  async createMachineTool(
    @Args("input") input: CreateMachineToolInput,
    @Context() context: any,
  ): Promise<MachineToolPayload> {
    return this.machineToolService.create(input, context);
  }

  @Mutation("updateMachineTool")
  async updateMachineTool(
    @Args("id") id: string,
    @Args("input") input: UpdateMachineToolInput,
    @Context() context: any,
  ): Promise<MachineToolPayload> {
    return this.machineToolService.update(id, input, context);
  }

  @Mutation("deleteMachineTool")
  async deleteMachineTool(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MachineToolPayload> {
    return this.machineToolService.delete(id, context);
  }

  @Mutation("restoreMachineTool")
  async restoreMachineTool(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MachineToolPayload> {
    return this.machineToolService.restore(id, context);
  }
}
