import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShippingNumberGenerator } from "./utils/shipping-number.generator.js";
import { ShippingAllocationHelper } from "./helpers/shipping-allocation.helper.js";
import { PalletContainerService } from "./pallet-container.service.js";
import { ShipmentService } from "./shipment.service.js";

describe("Shipping Module", () => {
  describe("ShippingNumberGenerator", () => {
    it("generates correct 12-digit box number with month char and series", () => {
      const date = new Date(2026, 8, 26); // September 26, 2026 -> Month char 'I'
      const boxNo = ShippingNumberGenerator.generateBoxNo({
        date,
        shipmentDailySeries: 1,
        boxIndex: 1,
        countryCode: "P",
      });

      expect(boxNo).toBe("P26I26010001");
    });

    it("generates continuous annual invoice number", () => {
      const invoiceSea = ShippingNumberGenerator.generateInvoiceNo({
        year: 2026,
        freightType: "SEA",
        annualSeries: 1,
      });
      expect(invoiceSea).toBe("CE-26-S-0001");

      const invoiceAir = ShippingNumberGenerator.generateInvoiceNo({
        year: 2026,
        freightType: "AIR",
        annualSeries: 42,
      });
      expect(invoiceAir).toBe("CE-26-A-0042");

      const invoiceLocal = ShippingNumberGenerator.generateInvoiceNo({
        year: 2026,
        freightType: "LOCAL",
        annualSeries: 1,
        suffix: "S",
      });
      expect(invoiceLocal).toBe("CE-26-L-0001S");
    });

    it("generates pallet number as sequence only (e.g. P1..P30)", () => {
      const palletNoP5 = ShippingNumberGenerator.generatePalletNo({
        sequenceNo: 5,
      });
      expect(palletNoP5).toBe("P5");

      const palletNoPlain = ShippingNumberGenerator.generatePalletNo({
        sequenceNo: 12,
        withPrefix: false,
      });
      expect(palletNoPlain).toBe("12");
    });

    it("generates shipment number", () => {
      const date = new Date(2026, 9, 9);
      const shipmentNo = ShippingNumberGenerator.generateShipmentNo({
        date,
        dailySeries: 3,
      });
      expect(shipmentNo).toBe("SHP-20261009-003");
    });
  });

  describe("ShippingAllocationHelper", () => {
    it("calculates pallet requirements correctly", () => {
      expect(ShippingAllocationHelper.calculateNoPallets(40)).toBe(1);
      expect(ShippingAllocationHelper.calculateNoPallets(41)).toBe(2);
      expect(ShippingAllocationHelper.calculateNoPallets(1200)).toBe(30);
    });

    it("enforces max 1200 boxes unless forced", () => {
      expect(() => ShippingAllocationHelper.calculateNoPallets(1201, 40, false)).toThrow(
        /exceeds shipment limit/,
      );
      expect(ShippingAllocationHelper.calculateNoPallets(1201, 40, true)).toBe(31);
    });

    it("chunks boxes into pallets of 40 and assigns sequence numbers & 12-digit box numbers", () => {
      const sampleBoxes = Array.from({ length: 95 }, (_, i) => ({
        id: i + 1,
        boxNo: `BOX-${i + 1}`,
        grossWeight: 10,
        netWeight: 8,
        totalQty: 100,
      }));

      const date = new Date(2026, 9, 9);
      const pallets = ShippingAllocationHelper.chunkAndAllocateBoxes({
        boxes: sampleBoxes,
        shipmentDate: date,
        shipmentDailySeries: 1,
        palletTareWeight: 15,
      });

      expect(pallets).toHaveLength(3); // 40 + 40 + 15 = 95 boxes
      expect(pallets[0].boxes).toHaveLength(40);
      expect(pallets[1].boxes).toHaveLength(40);
      expect(pallets[2].boxes).toHaveLength(15);

      // Sequences and box numbers
      expect(pallets[0].boxes[0].sequenceInPallet).toBe(1);
      expect(pallets[0].boxes[39].sequenceInPallet).toBe(40);
      expect(pallets[0].boxes[0].shippingBoxNo).toBe("P26J09010001");
      expect(pallets[1].boxes[0].shippingBoxNo).toBe("P26J09010041");

      // Weights
      expect(pallets[0].tareWeight).toBe(15);
      expect(pallets[0].netWeight).toBe(40 * 8); // 320
      expect(pallets[0].grossWeight).toBe(15 + 40 * 10); // 415
    });
  });

  describe("PalletContainerService", () => {
    let service: PalletContainerService;
    let mockPrisma: any;
    let mockLoader: any;
    let mockShipmentLoader: any;
    let mockBoxLoader: any;
    let mockAudit: any;

    beforeEach(() => {
      mockPrisma = {
        palletContainer: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        shipment: {
          findUnique: vi.fn(),
        },
        boxContainer: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          update: vi.fn(),
        },
        palletType: {
          findUnique: vi.fn(),
        },
        $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      };

      mockLoader = {
        byId: { load: vi.fn() },
        byShipmentId: { load: vi.fn() },
        clear: vi.fn(),
      };
      mockShipmentLoader = { clear: vi.fn() };
      mockBoxLoader = { clear: vi.fn() };
      mockAudit = { log: vi.fn().mockResolvedValue(undefined) };

      service = new PalletContainerService(
        mockPrisma as any,
        mockLoader as any,
        mockShipmentLoader as any,
        mockBoxLoader as any,
        mockAudit as any,
      );
    });

    it("creates a single empty pallet with correct sequence and tare weight", async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 1,
        shipmentNo: "SHP-20261009-001",
        shipmentDate: new Date(2026, 9, 9),
        status: "PREPARING",
        maxPalletLimit: 30,
        defaultPalletTypeId: 5,
        pallets: [],
      });

      mockPrisma.palletType.findUnique.mockResolvedValue({
        id: 5,
        weight: 18.5,
      });

      mockPrisma.palletContainer.create.mockResolvedValue({
        id: 101,
        shipmentId: 1,
        palletNo: "PLT-20261009-01-P01",
        sequenceNo: 1,
        palletTypeId: 5,
        tareWeight: 18.5,
        sealStatus: "UNSEALED",
      });

      const res = await service.create({
        shipmentId: 1,
      });

      expect(res.userErrors).toHaveLength(0);
      expect(mockPrisma.palletContainer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipmentId: 1,
            sequenceNo: 1,
            tareWeight: 18.5,
            sealStatus: "UNSEALED",
          }),
        }),
      );
    });

    it("toggles seal status to SEALED and UNSEALED", async () => {
      mockPrisma.palletContainer.findUnique.mockResolvedValue({
        id: 101,
        palletNo: "PLT-01",
        sealStatus: "UNSEALED",
        shipmentId: 1,
        shipment: { status: "PREPARING" },
      });

      mockPrisma.palletContainer.update.mockResolvedValue({
        id: 101,
        sealStatus: "SEALED",
      });

      const res = await service.toggleSeal(101, true);

      expect(res.userErrors).toHaveLength(0);
      expect(mockPrisma.palletContainer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 101 },
          data: expect.objectContaining({
            sealStatus: "SEALED",
          }),
        }),
      );
    });

    it("rejects modifications on sealed pallets", async () => {
      mockPrisma.palletContainer.findUnique.mockResolvedValue({
        id: 101,
        palletNo: "PLT-01",
        sealStatus: "SEALED",
        shipment: { status: "PREPARING" },
      });

      const res = await service.update(101, { maxCapacity: 50 });
      expect(res.userErrors).toHaveLength(1);
      expect(res.userErrors[0].message).toContain("SEALED");
    });
  });

  describe("ShipmentService Lifecycle", () => {
    let service: ShipmentService;
    let mockPrisma: any;
    let mockShipmentLoader: any;
    let mockPalletLoader: any;
    let mockBoxLoader: any;
    let mockAudit: any;

    beforeEach(() => {
      mockPrisma = {
        shipment: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          count: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        palletContainer: {
          create: vi.fn(),
          delete: vi.fn(),
        },
        boxContainer: {
          findMany: vi.fn(),
          update: vi.fn(),
        },
        salesOrder: {
          findUnique: vi.fn(),
          updateMany: vi.fn(),
          update: vi.fn(),
        },
        palletType: {
          findUnique: vi.fn(),
        },
        finishedGoodsLot: {
          findFirst: vi.fn(),
          update: vi.fn(),
        },
        finishedGoodsTransaction: {
          create: vi.fn(),
        },
        $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      };

      mockShipmentLoader = { byId: { load: vi.fn() }, clear: vi.fn() };
      mockPalletLoader = { clear: vi.fn() };
      mockBoxLoader = { clear: vi.fn() };
      mockAudit = { log: vi.fn().mockResolvedValue(undefined) };

      service = new ShipmentService(
        mockPrisma as any,
        mockShipmentLoader as any,
        mockPalletLoader as any,
        mockBoxLoader as any,
        mockAudit as any,
      );
    });

    it("finalization fails if any pallet is UNSEALED", async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 1,
        status: "PREPARING",
        pallets: [
          { id: 10, sealStatus: "SEALED" },
          { id: 11, sealStatus: "UNSEALED" },
        ],
      });

      const res = await service.finalize(1);
      expect(res.userErrors).toHaveLength(1);
      expect(res.userErrors[0].message).toContain("UNSEALED");
    });

    it("finalizes successfully when 100% of pallets are SEALED", async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 1,
        shipmentNo: "SHP-001",
        status: "PREPARING",
        pallets: [
          { id: 10, sealStatus: "SEALED" },
          { id: 11, sealStatus: "SEALED" },
        ],
      });

      mockPrisma.shipment.update.mockResolvedValue({
        id: 1,
        status: "FINALIZED",
      });

      const res = await service.finalize(1);
      expect(res.userErrors).toHaveLength(0);
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            status: "FINALIZED",
          }),
        }),
      );
    });

    it("shipOut deducts FG inventory and marks shipment as SHIPPED", async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 1,
        shipmentNo: "SHP-20261009-001",
        invoiceNo: "CE-26-S-0001",
        status: "FINALIZED",
        pallets: [
          {
            id: 10,
            boxContainers: [
              {
                id: 101,
                items: [
                  {
                    itemId: 5,
                    fabricationId: 1,
                    orderNo: "ORD-1",
                    lotNo: "LOT-1",
                    chargeNo: "CHG-1",
                    quantity: 50,
                    salesOrderId: 201,
                  },
                ],
              },
            ],
          },
        ],
        salesOrders: [{ id: 201 }],
      });

      mockPrisma.finishedGoodsLot.findFirst.mockResolvedValue({
        id: 500,
        availableQty: 100,
        allocatedQty: 50,
        checkingQty: 0,
        defectiveQty: 0,
        areaId: 1,
        locationId: 2,
        boxId: 3,
      });

      mockPrisma.salesOrder.findUnique.mockResolvedValue({
        id: 201,
        orderQty: 50,
        shippedQty: 0,
        status: "Shipping",
      });

      mockPrisma.shipment.update.mockResolvedValue({ id: 1, status: "SHIPPED" });

      const res = await service.shipOut(1);

      expect(res.userErrors).toHaveLength(0);
      expect(mockPrisma.finishedGoodsLot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 500 },
          data: expect.objectContaining({
            allocatedQty: 0, // 50 allocated - 50 shipped
          }),
        }),
      );
      expect(mockPrisma.finishedGoodsTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transactionType: "SHIPMENT",
            direction: "OUTBOUND",
            quantity: 50,
            referenceNo: "CE-26-S-0001",
          }),
        }),
      );
      expect(mockPrisma.salesOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 201 },
          data: expect.objectContaining({
            shippedQty: 50,
            shippingStatus: "Shipped",
            status: "Completed",
          }),
        }),
      );
    });
  });
});
