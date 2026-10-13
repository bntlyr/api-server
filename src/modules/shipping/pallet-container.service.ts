import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditTrailService } from "../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../graphql/common/context.helper.js";
import { createError } from "../../graphql/common/error.helper.js";
import { BoxContainerLoader } from "../master/box-container/box-container.loader.js";
import { PalletContainerLoader } from "./pallet-container.loader.js";
import { ShipmentLoader } from "./shipment.loader.js";
import { ShippingRulesValidator, SHIPPING_RULES } from "./rules/shipping.rules.js";
import { ShippingNumberGenerator } from "./utils/shipping-number.generator.js";
import { ShippingWeightHelper } from "./helpers/shipping-weight.helper.js";
import { Prisma } from "../../generated/prisma/client.js";
import type {
  CreatePalletContainerInput,
  MoveBoxContainerInput,
  PalletContainerPayload,
  RemoveBoxFromPalletInput,
  UpdatePalletContainerInput,
} from "../../generated/graphql/types.js";

@Injectable()
export class PalletContainerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly palletContainerLoader: PalletContainerLoader,
    private readonly shipmentLoader: ShipmentLoader,
    private readonly boxContainerLoader: BoxContainerLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    if (Number.isNaN(parsedId)) return null;
    return this.palletContainerLoader.byId.load(parsedId);
  }

  async findByShipmentId(shipmentId: number | string) {
    const parsedId = typeof shipmentId === "string" ? parseInt(shipmentId, 10) : shipmentId;
    if (Number.isNaN(parsedId)) return [];
    return this.palletContainerLoader.byShipmentId.load(parsedId);
  }

  /**
   * Create a single empty pallet container inside a shipment
   */
  async create(input: CreatePalletContainerInput, context?: any): Promise<PalletContainerPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const shipmentId = typeof input.shipmentId === "string" ? parseInt(input.shipmentId, 10) : input.shipmentId;

      const shipment = await this.prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: { pallets: { where: { deleted: false } } },
      });

      if (!shipment) {
        return {
          palletContainer: null,
          userErrors: [createError("Shipment not found")],
        };
      }

      ShippingRulesValidator.validateShipmentEditable(shipment.status);
      ShippingRulesValidator.validateShipmentPalletLimit(
        shipment.pallets.length,
        1,
        shipment.maxPalletLimit,
        Boolean(input.force),
      );

      const nextSequenceNo = shipment.pallets.length + 1;
      const palletTypeId = input.palletTypeId ?? shipment.defaultPalletTypeId;

      let tareWeight = 0;
      if (palletTypeId) {
        const palletType = await this.prisma.palletType.findUnique({
          where: { id: palletTypeId },
        });
        if (palletType) {
          tareWeight = Number(palletType.weight) || 0;
        }
      }

      const palletNo = ShippingNumberGenerator.generatePalletNo({
        sequenceNo: nextSequenceNo,
        date: shipment.shipmentDate,
      });

      const pallet = await this.prisma.palletContainer.create({
        data: {
          shipmentId,
          palletNo,
          sequenceNo: nextSequenceNo,
          palletTypeId,
          maxCapacity: input.maxCapacity ?? SHIPPING_RULES.MAX_BOXES_PER_PALLET,
          tareWeight,
          netWeight: 0,
          grossWeight: tareWeight,
          sealStatus: "UNSEALED",
          createdBy: userId !== "SYSTEM" ? userId : null,
          createdById: userId !== "SYSTEM" ? userId : null,
        },
      });

      this.palletContainerLoader.clear();
      this.shipmentLoader.clear(shipmentId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_PALLET_CONTAINER",
        method: "GRAPHQL_MUTATION",
        tableName: "PalletContainer",
        recordId: String(pallet.id),
        description: `Created pallet ${pallet.palletNo} in shipment ${shipment.shipmentNo}`,
        values: pallet as any,
        ipAddress,
        userAgent,
      });

      return {
        palletContainer: pallet as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        palletContainer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Update pallet type or max capacity
   */
  async update(id: number | string, input: UpdatePalletContainerInput, context?: any): Promise<PalletContainerPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const pallet = await this.prisma.palletContainer.findUnique({
        where: { id: parsedId },
        include: { shipment: true },
      });

      if (!pallet) {
        return {
          palletContainer: null,
          userErrors: [createError("Pallet container not found")],
        };
      }

      ShippingRulesValidator.validateShipmentEditable(pallet.shipment.status);
      ShippingRulesValidator.validatePalletUnsealed(pallet.sealStatus);

      let tareWeight = Number(pallet.tareWeight);
      if (input.palletTypeId !== undefined && input.palletTypeId !== pallet.palletTypeId) {
        if (input.palletTypeId === null) {
          tareWeight = 0;
        } else {
          const pt = await this.prisma.palletType.findUnique({
            where: { id: input.palletTypeId },
          });
          tareWeight = pt ? Number(pt.weight) : 0;
        }
      }

      const data: Prisma.PalletContainerUncheckedUpdateInput = {
        ...(input.palletTypeId !== undefined ? { palletTypeId: input.palletTypeId } : {}),
        ...(input.maxCapacity != null ? { maxCapacity: input.maxCapacity } : {}),
        tareWeight,
        grossWeight: tareWeight + Number(pallet.netWeight),
        updatedBy: userId !== "SYSTEM" ? userId : undefined,
        updatedById: userId !== "SYSTEM" ? userId : undefined,
      };

      const updated = await this.prisma.palletContainer.update({
        where: { id: parsedId },
        data,
      });

      this.palletContainerLoader.clear(parsedId);
      this.shipmentLoader.clear(pallet.shipmentId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_PALLET_CONTAINER",
        method: "GRAPHQL_MUTATION",
        tableName: "PalletContainer",
        recordId: String(parsedId),
        description: `Updated pallet ${pallet.palletNo}`,
        values: updated as any,
        ipAddress,
        userAgent,
      });

      return {
        palletContainer: updated as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        palletContainer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Delete pallet and unlink / relocate all boxes inside it, then re-sequence remaining pallets
   */
  async delete(
    id: number | string,
    targetAreaId?: number | null,
    targetLocationId?: number | null,
    context?: any,
  ): Promise<PalletContainerPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const pallet = await this.prisma.palletContainer.findUnique({
        where: { id: parsedId },
        include: {
          shipment: {
            include: {
              pallets: {
                where: { deleted: false },
                orderBy: { sequenceNo: "asc" },
              },
            },
          },
          boxContainers: {
            where: { deleted: false },
          },
        },
      });

      if (!pallet) {
        return {
          palletContainer: null,
          userErrors: [createError("Pallet container not found")],
        };
      }

      ShippingRulesValidator.validateShipmentEditable(pallet.shipment.status);
      ShippingRulesValidator.validatePalletUnsealed(pallet.sealStatus);

      await this.prisma.$transaction(async (tx) => {
        // Unlink or relocate boxes
        for (const box of pallet.boxContainers) {
          await tx.boxContainer.update({
            where: { id: box.id },
            data: {
              palletContainerId: null,
              sequenceInPallet: null,
              shippingBoxNo: null,
              ...(targetAreaId ? { areaId: targetAreaId } : {}),
              ...(targetLocationId ? { locationId: targetLocationId } : {}),
            },
          });
        }

        // Soft-delete pallet
        await tx.palletContainer.delete({
          where: { id: parsedId },
        });

        // Re-sequence remaining pallets
        const remainingPallets = pallet.shipment.pallets.filter((p) => p.id !== parsedId);
        for (let i = 0; i < remainingPallets.length; i++) {
          const p = remainingPallets[i];
          const newSequence = i + 1;
          if (p.sequenceNo !== newSequence) {
            await tx.palletContainer.update({
              where: { id: p.id },
              data: { sequenceNo: newSequence },
            });
          }
        }
      });

      this.palletContainerLoader.clear();
      this.boxContainerLoader.clear();
      this.shipmentLoader.clear(pallet.shipmentId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_PALLET_CONTAINER",
        method: "GRAPHQL_MUTATION",
        tableName: "PalletContainer",
        recordId: String(parsedId),
        description: `Deleted pallet ${pallet.palletNo} and unlinked ${pallet.boxContainers.length} boxes`,
        ipAddress,
        userAgent,
      });

      return {
        palletContainer: pallet as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        palletContainer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Toggle pallet seal status (SEALED / UNSEALED)
   */
  async toggleSeal(palletContainerId: number | string, seal: boolean, context?: any): Promise<PalletContainerPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof palletContainerId === "string" ? parseInt(palletContainerId, 10) : palletContainerId;

      const pallet = await this.prisma.palletContainer.findUnique({
        where: { id: parsedId },
        include: { shipment: true },
      });

      if (!pallet) {
        return {
          palletContainer: null,
          userErrors: [createError("Pallet container not found")],
        };
      }

      ShippingRulesValidator.validateShipmentEditable(pallet.shipment.status);

      const newSealStatus = seal ? "SEALED" : "UNSEALED";
      const updated = await this.prisma.palletContainer.update({
        where: { id: parsedId },
        data: {
          sealStatus: newSealStatus,
          sealedAt: seal ? new Date() : null,
          sealedById: seal ? (userId !== "SYSTEM" ? userId : null) : null,
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
          updatedById: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.palletContainerLoader.clear(parsedId);
      this.shipmentLoader.clear(pallet.shipmentId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: seal ? "SEAL_PALLET" : "UNSEAL_PALLET",
        method: "GRAPHQL_MUTATION",
        tableName: "PalletContainer",
        recordId: String(parsedId),
        description: `${seal ? "Sealed" : "Unsealed"} pallet ${pallet.palletNo}`,
        values: updated as any,
        ipAddress,
        userAgent,
      });

      return {
        palletContainer: updated as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        palletContainer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Move a BoxContainer to another PalletContainer
   */
  async moveBox(input: MoveBoxContainerInput, context?: any): Promise<PalletContainerPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const boxId = typeof input.boxContainerId === "string" ? parseInt(input.boxContainerId, 10) : input.boxContainerId;
      const targetPalletId =
        typeof input.targetPalletContainerId === "string"
          ? parseInt(input.targetPalletContainerId, 10)
          : input.targetPalletContainerId;

      const [box, targetPallet] = await Promise.all([
        this.prisma.boxContainer.findUnique({
          where: { id: boxId },
          include: { palletContainer: { include: { shipment: true } } },
        }),
        this.prisma.palletContainer.findUnique({
          where: { id: targetPalletId },
          include: {
            shipment: true,
            boxContainers: { where: { deleted: false }, orderBy: { sequenceInPallet: "asc" } },
          },
        }),
      ]);

      if (!box) {
        return {
          palletContainer: null,
          userErrors: [createError("Box container not found")],
        };
      }

      if (!targetPallet) {
        return {
          palletContainer: null,
          userErrors: [createError("Target pallet container not found")],
        };
      }

      // Check validations
      if (box.palletContainer) {
        ShippingRulesValidator.validateShipmentEditable(box.palletContainer.shipment.status);
        ShippingRulesValidator.validatePalletUnsealed(box.palletContainer.sealStatus);
      }
      ShippingRulesValidator.validateShipmentEditable(targetPallet.shipment.status);
      ShippingRulesValidator.validatePalletUnsealed(targetPallet.sealStatus);

      // Validate capacity
      ShippingRulesValidator.validatePalletBoxLimit(
        targetPallet.boxContainers.length,
        1,
        targetPallet.maxCapacity,
        Boolean(input.force),
      );

      const sourcePalletId = box.palletContainerId;
      const newSequenceInPallet = targetPallet.boxContainers.length + 1;

      await this.prisma.$transaction(async (tx) => {
        // Reassign box
        await tx.boxContainer.update({
          where: { id: boxId },
          data: {
            palletContainerId: targetPalletId,
            sequenceInPallet: newSequenceInPallet,
          },
        });

        // If source pallet existed and is different, re-sequence source pallet boxes
        if (sourcePalletId && sourcePalletId !== targetPalletId) {
          const sourceBoxes = await tx.boxContainer.findMany({
            where: { palletContainerId: sourcePalletId, deleted: false, id: { not: boxId } },
            orderBy: { sequenceInPallet: "asc" },
          });

          for (let i = 0; i < sourceBoxes.length; i++) {
            await tx.boxContainer.update({
              where: { id: sourceBoxes[i].id },
              data: { sequenceInPallet: i + 1 },
            });
          }

          await ShippingWeightHelper.recalculatePalletWeight(tx, sourcePalletId);
        }

        // Recalculate target pallet weight
        await ShippingWeightHelper.recalculatePalletWeight(tx, targetPalletId);
      });

      this.palletContainerLoader.clear();
      this.boxContainerLoader.clear();
      this.shipmentLoader.clear(targetPallet.shipmentId);

      const updatedTargetPallet = await this.prisma.palletContainer.findUnique({
        where: { id: targetPalletId },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "MOVE_BOX_TO_PALLET",
        method: "GRAPHQL_MUTATION",
        tableName: "PalletContainer",
        recordId: String(targetPalletId),
        description: `Moved box ${box.boxNo} to pallet ${targetPallet.palletNo}`,
        ipAddress,
        userAgent,
      });

      return {
        palletContainer: updatedTargetPallet as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        palletContainer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Remove a BoxContainer from a pallet
   */
  async removeBox(input: RemoveBoxFromPalletInput, context?: any): Promise<PalletContainerPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const boxId = typeof input.boxContainerId === "string" ? parseInt(input.boxContainerId, 10) : input.boxContainerId;

      const box = await this.prisma.boxContainer.findUnique({
        where: { id: boxId },
        include: { palletContainer: { include: { shipment: true } } },
      });

      if (!box || !box.palletContainer) {
        return {
          palletContainer: null,
          userErrors: [createError("Box is not assigned to any pallet container")],
        };
      }

      const pallet = box.palletContainer;
      ShippingRulesValidator.validateShipmentEditable(pallet.shipment.status);
      ShippingRulesValidator.validatePalletUnsealed(pallet.sealStatus);

      const palletId = pallet.id;

      await this.prisma.$transaction(async (tx) => {
        // Unlink box
        await tx.boxContainer.update({
          where: { id: boxId },
          data: {
            palletContainerId: null,
            sequenceInPallet: null,
            shippingBoxNo: null,
            ...(input.targetAreaId ? { areaId: input.targetAreaId } : {}),
            ...(input.targetLocationId ? { locationId: input.targetLocationId } : {}),
          },
        });

        // Re-sequence remaining boxes in pallet
        const remainingBoxes = await tx.boxContainer.findMany({
          where: { palletContainerId: palletId, deleted: false, id: { not: boxId } },
          orderBy: { sequenceInPallet: "asc" },
        });

        for (let i = 0; i < remainingBoxes.length; i++) {
          await tx.boxContainer.update({
            where: { id: remainingBoxes[i].id },
            data: { sequenceInPallet: i + 1 },
          });
        }

        // Recalculate weight
        await ShippingWeightHelper.recalculatePalletWeight(tx, palletId);
      });

      this.palletContainerLoader.clear(palletId);
      this.boxContainerLoader.clear();
      this.shipmentLoader.clear(pallet.shipmentId);

      const updatedPallet = await this.prisma.palletContainer.findUnique({
        where: { id: palletId },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "REMOVE_BOX_FROM_PALLET",
        method: "GRAPHQL_MUTATION",
        tableName: "PalletContainer",
        recordId: String(palletId),
        description: `Removed box ${box.boxNo} from pallet ${pallet.palletNo}`,
        ipAddress,
        userAgent,
      });

      return {
        palletContainer: updatedPallet as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        palletContainer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
