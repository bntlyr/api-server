import { Resolver, Mutation, Args, Context } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PrintService } from "./print.service.js";
import type {
  PrintProductionSlipInput,
  PrintProductionSlipBatchInput,
  PrintTrialCardInput,
  PrintTrialCardBatchInput,
  PrintReportPayload,
} from "../generated/graphql/types.js";
import type { GraphQLContext } from "../graphql/context.js";

@Resolver()
@UseGuards(JwtAuthGuard)
export class PrintResolver {
  constructor(private readonly printService: PrintService) {}

  @Mutation("printProductionSlip")
  async printProductionSlip(
    @Args("input") input: PrintProductionSlipInput,
    @Context() context: GraphQLContext,
  ): Promise<PrintReportPayload> {
    return this.printService.printProductionSlip(input, context);
  }

  @Mutation("printProductionSlipBatch")
  async printProductionSlipBatch(
    @Args("input") input: PrintProductionSlipBatchInput,
    @Context() context: GraphQLContext,
  ): Promise<PrintReportPayload> {
    return this.printService.printProductionSlipBatch(input, context);
  }

  @Mutation("printTrialCard")
  async printTrialCard(
    @Args("input") input: PrintTrialCardInput,
    @Context() context: GraphQLContext,
  ): Promise<PrintReportPayload> {
    return this.printService.printTrialCard(input, context);
  }

  @Mutation("printTrialCardBatch")
  async printTrialCardBatch(
    @Args("input") input: PrintTrialCardBatchInput,
    @Context() context: GraphQLContext,
  ): Promise<PrintReportPayload> {
    return this.printService.printTrialCardBatch(input, context);
  }
}
