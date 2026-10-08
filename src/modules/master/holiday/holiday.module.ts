import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { HolidayService } from "./holiday.service.js";
import { HolidayLoader } from "./holiday.loader.js";
import { HolidayQueryResolver } from "./resolvers/holiday.query.js";
import { HolidayMutationResolver } from "./resolvers/holiday.mutation.js";
import { HolidayRelationResolver } from "./resolvers/holiday.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    HolidayLoader,
    HolidayService,
    HolidayQueryResolver,
    HolidayMutationResolver,
    HolidayRelationResolver,
  ],
  exports: [HolidayService, HolidayLoader],
})
export class HolidayModule {}
