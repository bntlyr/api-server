import { Args, Context, Query, Resolver } from "@nestjs/graphql";
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
  async bookingById(@Args("id") id: string, @Context() context?: any) {
    return this.bookingService.findOne(id, context);
  }

  @Query("bookingsPaginated")
  async bookingsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: BookingFilterInput | null,
    @Context() context?: any,
  ): Promise<BookingConnection> {
    return this.bookingService.findMany(pagination, filter, context);
  }

  @Query("checkRemakeEligibility")
  async checkRemakeEligibility(@Args("salesOrderId") salesOrderId: number) {
    return this.bookingService.checkRemakeEligibility(salesOrderId);
  }
}
