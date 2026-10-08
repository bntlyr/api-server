import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { SectionService } from "../section.service.js";
import type {
  CreateSectionInput,
  UpdateSectionInput,
  SectionPayload,
} from "../../../generated/graphql/types.js";

@Resolver("Section")
export class SectionMutationResolver {
  constructor(private readonly sectionService: SectionService) {}

  @Mutation("createSection")
  async createSection(
    @Args("input") input: CreateSectionInput,
    @Context() context: any,
  ): Promise<SectionPayload> {
    return this.sectionService.create(input, context);
  }

  @Mutation("updateSection")
  async updateSection(
    @Args("id") id: string,
    @Args("input") input: UpdateSectionInput,
    @Context() context: any,
  ): Promise<SectionPayload> {
    return this.sectionService.update(id, input, context);
  }

  @Mutation("deleteSection")
  async deleteSection(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<SectionPayload> {
    return this.sectionService.delete(id, context);
  }

  @Mutation("restoreSection")
  async restoreSection(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<SectionPayload> {
    return this.sectionService.restore(id, context);
  }
}
