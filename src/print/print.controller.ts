import {
  Body,
  Controller,
  Post,
  Res,
  UseGuards,
  HttpStatus,
  Req,
} from "@nestjs/common";
import type { Response, Request } from "express";
import { PrintService } from "./print.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type {
  PrintProductionSlipInput,
  PrintProductionSlipBatchInput,
  PrintTrialCardInput,
  PrintTrialCardBatchInput,
} from "../generated/graphql/types.js";

@Controller("api/print")
export class PrintController {
  constructor(private readonly printService: PrintService) {}

  @Post("production-slip")
  @UseGuards(JwtAuthGuard)
  async printProductionSlip(
    @Body() input: PrintProductionSlipInput,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.printService.printProductionSlip(input, { req, res } as any);

    if (!result.success) {
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    return res.status(HttpStatus.OK).json(result);
  }

  @Post("production-slip/batch")
  @UseGuards(JwtAuthGuard)
  async printProductionSlipBatch(
    @Body() input: PrintProductionSlipBatchInput,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.printService.printProductionSlipBatch(input, { req, res } as any);

    if (!result.success) {
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    return res.status(HttpStatus.OK).json(result);
  }

  @Post("trial-card")
  @UseGuards(JwtAuthGuard)
  async printTrialCard(
    @Body() input: PrintTrialCardInput,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.printService.printTrialCard(input, { req, res } as any);

    if (!result.success) {
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    return res.status(HttpStatus.OK).json(result);
  }

  @Post("trial-card/batch")
  @UseGuards(JwtAuthGuard)
  async printTrialCardBatch(
    @Body() input: PrintTrialCardBatchInput,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.printService.printTrialCardBatch(input, { req, res } as any);

    if (!result.success) {
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    return res.status(HttpStatus.OK).json(result);
  }
}
