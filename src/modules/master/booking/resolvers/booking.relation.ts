import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { PrismaService } from "../../../../prisma/prisma.service.js";
import type { Booking } from "../../../../generated/graphql/types.js";

@Resolver("Booking")
export class BookingRelationResolver {
  constructor(private readonly prisma: PrismaService) {}

  @ResolveField("productionSlip")
  async productionSlip(@Parent() booking: Booking) {
    if (!booking.productionSlipId) return null;
    return this.prisma.productionSlip.findUnique({
      where: { id: booking.productionSlipId },
    });
  }

  @ResolveField("productionProcess")
  async productionProcess(@Parent() booking: Booking) {
    if (!booking.productionProcessId) return null;
    return this.prisma.productionProcess.findUnique({
      where: { id: booking.productionProcessId },
    });
  }

  @ResolveField("salesOrder")
  async salesOrder(@Parent() booking: Booking) {
    if (!booking.salesOrderId) return null;
    return this.prisma.salesOrder.findUnique({
      where: { id: booking.salesOrderId },
    });
  }

  @ResolveField("item")
  async item(@Parent() booking: Booking) {
    if (!booking.itemId) return null;
    return this.prisma.item.findUnique({
      where: { id: booking.itemId },
    });
  }

  @ResolveField("fabrication")
  async fabrication(@Parent() booking: Booking) {
    if (!booking.fabricationId) return null;
    return this.prisma.fabrication.findUnique({
      where: { id: booking.fabricationId },
    });
  }

  @ResolveField("waxDefect")
  async waxDefect(@Parent() booking: Booking) {
    return this.prisma.waxDefect.findFirst({
      where: { bookingId: Number(booking.id), deleted: false },
    });
  }

  @ResolveField("coatingDefect")
  async coatingDefect(@Parent() booking: Booking) {
    return this.prisma.coatingDefect.findFirst({
      where: { bookingId: Number(booking.id), deleted: false },
    });
  }

  @ResolveField("castingDefect")
  async castingDefect(@Parent() booking: Booking) {
    return this.prisma.castingDefect.findFirst({
      where: { bookingId: Number(booking.id), deleted: false },
    });
  }

  @ResolveField("prefinDefect")
  async prefinDefect(@Parent() booking: Booking) {
    return this.prisma.prefinDefect.findFirst({
      where: { bookingId: Number(booking.id), deleted: false },
    });
  }

  @ResolveField("fabDefect")
  async fabDefect(@Parent() booking: Booking) {
    return this.prisma.fabDefect.findFirst({
      where: { bookingId: Number(booking.id), deleted: false },
    });
  }

  @ResolveField("mimDefect")
  async mimDefect(@Parent() booking: Booking) {
    return this.prisma.mimDefect.findFirst({
      where: { bookingId: Number(booking.id), deleted: false },
    });
  }
}
