import { ProcessLoader } from "../../process/process.loader.js";
import type { ProcessIteration as PrismaProcessIteration } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("ProcessIteration")
export class ProcessIterationRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processLoader: ProcessLoader,
  ) {}
  /**
   * Field resolver / relation resolver for ProcessIteration.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("process")
  async process(@Parent() processIteration: PrismaProcessIteration) {
    if (!processIteration.processId) return null;
    return this.processLoader.byId.load(processIteration.processId);
  }
}
