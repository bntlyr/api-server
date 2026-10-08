import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { MachineService } from "../machine.service.js";
import type {
  CreateMachineInput,
  UpdateMachineInput,
  MachinePayload,
} from "../../../../generated//graphql/types.js";

@Resolver("Machine")
export class MachineMutationResolver {
  constructor(private readonly machineService: MachineService) {}

  @Mutation("createMachine")
  async createMachine(
    @Args("input") input: CreateMachineInput,
    @Context() context: any,
  ): Promise<MachinePayload> {
    return this.machineService.create(input, context);
  }

  @Mutation("updateMachine")
  async updateMachine(
    @Args("id") id: string,
    @Args("input") input: UpdateMachineInput,
    @Context() context: any,
  ): Promise<MachinePayload> {
    return this.machineService.update(id, input, context);
  }

  @Mutation("deleteMachine")
  async deleteMachine(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MachinePayload> {
    return this.machineService.delete(id, context);
  }

  @Mutation("restoreMachine")
  async restoreMachine(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MachinePayload> {
    return this.machineService.restore(id, context);
  }
}
