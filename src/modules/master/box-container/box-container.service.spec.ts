import { describe, it, expect, vi, beforeEach } from "vitest";
import { BoxContainerService } from "./box-container.service.js";

describe("BoxContainerService", () => {
  let service: BoxContainerService;
  let mockPrisma: any;
  let mockLoader: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      boxContainer: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        restore: vi.fn(),
      },
      boxContainerItem: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    mockLoader = {
      byId: { load: vi.fn() },
      clear: vi.fn(),
    };

    mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new BoxContainerService(mockPrisma as any, mockLoader as any, mockAudit as any);
  });

  describe("createBoxContainer", () => {
    it("creates an OPEN box container in the packing area", async () => {
      mockPrisma.boxContainer.create.mockResolvedValue({
        id: 1,
        boxNo: "BOX-202610-0001",
        boxTypeId: 2,
        areaId: 10,
        locationId: 20,
        status: "OPEN",
      });

      const res = await service.create({
        boxNo: "BOX-202610-0001",
        boxTypeId: 2,
        areaId: 10,
        locationId: 20,
      });

      expect(res.userErrors).toHaveLength(0);
      expect(mockPrisma.boxContainer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            boxNo: "BOX-202610-0001",
            boxTypeId: 2,
            areaId: 10,
            locationId: 20,
          }),
        }),
      );
    });
  });

  describe("addItems", () => {
    it("adds lots to container and recalculates totalQty and grossWeight", async () => {
      mockPrisma.boxContainer.findUnique.mockResolvedValue({
        id: 1,
        boxNo: "BOX-202610-0001",
        boxType: { weight: 2.5 },
        status: "OPEN",
        deleted: false,
      });

      mockPrisma.boxContainerItem.create.mockResolvedValue({
        id: 11,
        quantity: 250,
      });

      mockPrisma.boxContainerItem.findMany.mockResolvedValue([
        {
          id: 11,
          quantity: 250,
          item: { stdItemWt: 0.1 }, // 250 * 0.1 = 25kg + 2.5kg box = 27.5kg gross
        },
      ]);

      mockPrisma.boxContainer.update.mockResolvedValue({
        id: 1,
        totalQty: 250,
        netWeight: 25,
        grossWeight: 27.5,
      });

      const res = await service.addItems({
        boxContainerId: 1,
        items: [
          {
            salesOrderId: 1,
            itemId: 50,
            orderNo: "SO-100",
            lotNo: "SO-100-01",
            quantity: 250,
          },
        ],
      });

      expect(res.userErrors).toHaveLength(0);
      expect(mockPrisma.boxContainer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            totalQty: 250,
            netWeight: 25,
            grossWeight: 27.5,
          }),
        }),
      );
    });
  });

  describe("closeBoxContainer", () => {
    it("closes container and sets destination stock area and location", async () => {
      mockPrisma.boxContainer.findUnique.mockResolvedValue({
        id: 1,
        boxNo: "BOX-202610-0001",
        status: "OPEN",
        deleted: false,
      });

      mockPrisma.boxContainer.update.mockResolvedValue({
        id: 1,
        status: "CLOSED",
        areaId: 30,
        locationId: 40,
      });

      const res = await service.closeBoxContainer({
        boxContainerId: 1,
        destinationAreaId: 30,
        destinationLocationId: 40,
      });

      expect(res.userErrors).toHaveLength(0);
      expect(mockPrisma.boxContainer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            status: "CLOSED",
            areaId: 30,
            locationId: 40,
          }),
        }),
      );
    });
  });
});
