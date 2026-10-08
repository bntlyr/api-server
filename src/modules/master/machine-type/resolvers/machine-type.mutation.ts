import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { MachineTypeService } from "../machine-type.service.js";
import type {
  CreateMachineTypeInput,
  UpdateMachineTypeInput,
  MachineTypePayload,
} from "../../../../generated//graphql/types.js";

@Resolver("MachineType")
export class MachineTypeMutationResolver {
  constructor(private readonly machineTypeService: MachineTypeService) {}

  @Mutation("createMachineType")
  async createMachineType(
    @Args("input") input: CreateMachineTypeInput,
    @Context() context: any,
  ): Promise<MachineTypePayload> {
    return this.machineTypeService.create(input, context);
  }

  @Mutation("updateMachineType")
  async updateMachineType(
    @Args("id") id: string,
    @Args("input") input: UpdateMachineTypeInput,
    @Context() context: any,
  ): Promise<MachineTypePayload> {
    return this.machineTypeService.update(id, input, context);
  }

  @Mutation("deleteMachineType")
  async deleteMachineType(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MachineTypePayload> {
    return this.machineTypeService.delete(id, context);
  }

  @Mutation("restoreMachineType")
  async restoreMachineType(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MachineTypePayload> {
    return this.machineTypeService.restore(id, context);
  }
}
