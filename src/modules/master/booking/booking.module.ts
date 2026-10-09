import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { BookingService } from "./booking.service.js";
import { BookingLoader } from "./booking.loader.js";
import { BookingQueryResolver } from "./resolvers/booking.query.js";
import { BookingMutationResolver } from "./resolvers/booking.mutation.js";
import { BookingRelationResolver } from "./resolvers/booking.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    BookingLoader,
    BookingService,
    BookingQueryResolver,
    BookingMutationResolver,
    BookingRelationResolver,
  ],
  exports: [BookingService, BookingLoader],
})
export class BookingModule {}
