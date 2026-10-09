import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { BookingService } from "../booking.service.js";
import type {
  CreateBookingInput,
  UpdateBookingInput,
  BookingPayload,
} from "../../../../generated/graphql/types.js";

@Resolver("Booking")
export class BookingMutationResolver {
  constructor(private readonly bookingService: BookingService) {}

  @Mutation("createBooking")
  async createBooking(
    @Args("input") input: CreateBookingInput,
    @Context() context: any,
  ): Promise<BookingPayload> {
    return this.bookingService.create(input, context);
  }

  @Mutation("updateBooking")
  async updateBooking(
    @Args("id") id: string,
    @Args("input") input: UpdateBookingInput,
    @Context() context: any,
  ): Promise<BookingPayload> {
    return this.bookingService.update(id, input, context);
  }

  @Mutation("deleteBooking")
  async deleteBooking(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<BookingPayload> {
    return this.bookingService.delete(id, context);
  }

  @Mutation("restoreBooking")
  async restoreBooking(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<BookingPayload> {
    return this.bookingService.restore(id, context);
  }

  @Mutation("bookProcessWithDefects")
  async bookProcessWithDefects(
    @Args("input") input: any,
    @Context() context: any,
  ): Promise<BookingPayload> {
    return this.bookingService.bookProcessWithDefects(input, context);
  }
}
