import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ToolService } from "../tool.service.js";
import type {
  CreateToolInput,
  UpdateToolInput,
  ToolPayload,
} from "../../../generated/graphql/types.js";

@Resolver("Tool")
export class ToolMutationResolver {
  constructor(private readonly toolService: ToolService) {}

  @Mutation("createTool")
  async createTool(
    @Args("input") input: CreateToolInput,
    @Context() context: any,
  ): Promise<ToolPayload> {
    return this.toolService.create(input, context);
  }

  @Mutation("updateTool")
  async updateTool(
    @Args("id") id: string,
    @Args("input") input: UpdateToolInput,
    @Context() context: any,
  ): Promise<ToolPayload> {
    return this.toolService.update(id, input, context);
  }

  @Mutation("deleteTool")
  async deleteTool(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ToolPayload> {
    return this.toolService.delete(id, context);
  }

  @Mutation("restoreTool")
  async restoreTool(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ToolPayload> {
    return this.toolService.restore(id, context);
  }
}
