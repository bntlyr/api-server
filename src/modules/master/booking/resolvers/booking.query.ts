import { Args, Query, Resolver } from "@nestjs/graphql";
import { BookingService } from "../booking.service.js";
import type {
  BookingFilterInput,
  PaginationInput,
  BookingConnection,
} from "../../../../generated/graphql/types.js";

@Resolver("Booking")
export class BookingQueryResolver {
  constructor(private readonly bookingService: BookingService) {}

  @Query("bookingById")
  async bookingById(@Args("id") id: string) {
    return this.bookingService.findOne(id);
  }

  @Query("bookingsPaginated")
  async bookingsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: BookingFilterInput | null,
  ): Promise<BookingConnection> {
    return this.bookingService.findMany(pagination, filter);
  }

  @Query("checkRemakeEligibility")
  async checkRemakeEligibility(@Args("salesOrderId") salesOrderId: number) {
    return this.bookingService.checkRemakeEligibility(salesOrderId);
  }
}
