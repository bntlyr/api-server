import { ProcessLoader } from "../../process/process.loader.js";
import type { Parameter as PrismaParameter } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("Parameter")
export class ParameterRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processLoader: ProcessLoader,
  ) {}
  /**
   * Field resolver / relation resolver for Parameter.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("process")
  async process(@Parent() parameter: PrismaParameter) {
    if (!parameter.processId) return null;
    return this.processLoader.byId.load(parameter.processId);
  }
}
