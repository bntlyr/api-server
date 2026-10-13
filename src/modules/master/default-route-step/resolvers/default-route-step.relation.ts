import { ProcessLoader } from "../../process/process.loader.js";
import { SectionLoader } from "../../section/section.loader.js";
import { DefaultRouteMachiningLoader } from "../../default-route-machining/default-route-machining.loader.js";
import { DefaultRouteIterationLoader } from "../../default-route-iteration/default-route-iteration.loader.js";
import { DefaultRouteParameterLoader } from "../../default-route-parameter/default-route-parameter.loader.js";
import { DefaultRouteLoader } from "../../default-route/default-route.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";
import type { DefaultRouteStep as PrismaDefaultRouteStep } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("DefaultRouteStep")
export class DefaultRouteStepRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultRouteLoader: DefaultRouteLoader,
    private readonly defaultRouteParameterLoader: DefaultRouteParameterLoader,
    private readonly defaultRouteIterationLoader: DefaultRouteIterationLoader,
    private readonly defaultRouteMachiningLoader: DefaultRouteMachiningLoader,
    private readonly sectionLoader: SectionLoader,
    private readonly processLoader: ProcessLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() defaultRouteStep: PrismaDefaultRouteStep) {
    return resolveAuditEmployeeId(defaultRouteStep.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() defaultRouteStep: PrismaDefaultRouteStep) {
    return resolveAuditEmployeeId(defaultRouteStep.updatedBy, this.userLoader);
  }

  @ResolveField("defaultRoute")
  async defaultRoute(@Parent() defaultRouteStep: PrismaDefaultRouteStep) {
    if (!defaultRouteStep.defaultRouteId) return null;
    return this.defaultRouteLoader.byId.load(defaultRouteStep.defaultRouteId);
  }

  @ResolveField("defaultRouteParameters")
  async defaultRouteParameters(@Parent() defaultRouteStep: PrismaDefaultRouteStep) {
    return this.defaultRouteParameterLoader.byDefaultRouteStepId.load(defaultRouteStep.id);
  }

  @ResolveField("defaultRouteIterations")
  async defaultRouteIterations(@Parent() defaultRouteStep: PrismaDefaultRouteStep) {
    return this.defaultRouteIterationLoader.byDefaultRouteStepId.load(defaultRouteStep.id);
  }

  @ResolveField("defaultRouteMachinings")
  async defaultRouteMachinings(@Parent() defaultRouteStep: PrismaDefaultRouteStep) {
    return this.defaultRouteMachiningLoader.byDefaultRouteStepId.load(defaultRouteStep.id);
  }

  @ResolveField("section")
  async section(@Parent() defaultRouteStep: PrismaDefaultRouteStep) {
    if (!defaultRouteStep.sectionId) return null;
    return this.sectionLoader.byId.load(defaultRouteStep.sectionId);
  }

  @ResolveField("process")
  async process(@Parent() defaultRouteStep: PrismaDefaultRouteStep) {
    if (!defaultRouteStep.processId) return null;
    return this.processLoader.byId.load(defaultRouteStep.processId);
  }
}
