import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { CoatingDefectService } from "../coating-defect.service.js";
import type {
  CreateCoatingDefectInput,
  UpdateCoatingDefectInput,
  CoatingDefectPayload,
} from "../../../../generated/graphql/types.js";

@Resolver("CoatingDefect")
export class CoatingDefectMutationResolver {
  constructor(private readonly coatingDefectService: CoatingDefectService) {}

  @Mutation("createCoatingDefect")
  async createCoatingDefect(
    @Args("input") input: CreateCoatingDefectInput,
    @Context() context: any,
  ): Promise<CoatingDefectPayload> {
    return this.coatingDefectService.create(input, context);
  }

  @Mutation("updateCoatingDefect")
  async updateCoatingDefect(
    @Args("id") id: string,
    @Args("input") input: UpdateCoatingDefectInput,
    @Context() context: any,
  ): Promise<CoatingDefectPayload> {
    return this.coatingDefectService.update(id, input, context);
  }

  @Mutation("deleteCoatingDefect")
  async deleteCoatingDefect(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<CoatingDefectPayload> {
    return this.coatingDefectService.delete(id, context);
  }

  @Mutation("restoreCoatingDefect")
  async restoreCoatingDefect(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<CoatingDefectPayload> {
    return this.coatingDefectService.restore(id, context);
  }
}
