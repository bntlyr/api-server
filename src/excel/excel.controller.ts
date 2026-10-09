import {
  Body,
  Controller,
  Post,
  Res,
  UseGuards,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import { ExcelService } from "./excel.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { ExportToExcelInput } from "../generated/graphql/types.js";

@Controller("api/export")
export class ExcelController {
  constructor(private readonly excelService: ExcelService) {}

  @Post("excel")
  @UseGuards(JwtAuthGuard)
  async exportExcel(
    @Body() input: ExportToExcelInput,
    @Res() res: Response,
  ) {
    const result = await this.excelService.exportToExcel(input);

    if (!result.success) {
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    return res.status(HttpStatus.OK).json(result);
  }
}
