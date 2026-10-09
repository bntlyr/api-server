import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { ExcelService } from "./excel.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type {
  ExportToExcelInput,
  ExportToExcelPayload,
} from "../generated/graphql/types.js";

@Resolver()
export class ExcelResolver {
  constructor(private readonly excelService: ExcelService) {}

  @Mutation("exportToExcel")
  @UseGuards(JwtAuthGuard)
  async exportToExcel(
    @Args("input") input: ExportToExcelInput,
  ): Promise<ExportToExcelPayload> {
    return this.excelService.exportToExcel(input);
  }
}
