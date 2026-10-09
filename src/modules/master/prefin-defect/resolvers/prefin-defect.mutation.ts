import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { PrefinDefectService } from "../prefin-defect.service.js";
import type {
  CreatePrefinDefectInput,
  UpdatePrefinDefectInput,
  PrefinDefectPayload,
} from "../../../../generated/graphql/types.js";

@Resolver("PrefinDefect")
export class PrefinDefectMutationResolver {
  constructor(private readonly prefinDefectService: PrefinDefectService) {}

  @Mutation("createPrefinDefect")
  async createPrefinDefect(
    @Args("input") input: CreatePrefinDefectInput,
    @Context() context: any,
  ): Promise<PrefinDefectPayload> {
    return this.prefinDefectService.create(input, context);
  }

  @Mutation("updatePrefinDefect")
  async updatePrefinDefect(
    @Args("id") id: string,
    @Args("input") input: UpdatePrefinDefectInput,
    @Context() context: any,
  ): Promise<PrefinDefectPayload> {
    return this.prefinDefectService.update(id, input, context);
  }

  @Mutation("deletePrefinDefect")
  async deletePrefinDefect(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<PrefinDefectPayload> {
    return this.prefinDefectService.delete(id, context);
  }

  @Mutation("restorePrefinDefect")
  async restorePrefinDefect(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<PrefinDefectPayload> {
    return this.prefinDefectService.restore(id, context);
  }
}
