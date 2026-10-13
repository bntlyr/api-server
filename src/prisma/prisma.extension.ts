import { Prisma } from "../generated/prisma/client.js";
import { getCurrentUserId } from "../graphql/common/context.helper.js";

const nonSoftDeleteModels = new Set([
  "Notification",
  "NotificationRecipient",
  "OrderSequence",
  "UserPage",
  "Page",
]);

const modelsWithoutDeletedBy = new Set([
  "Notification",
  "NotificationRecipient",
  "OrderSequence",
  "Page",
  "User",
]);

const modelsWithoutUpdatedBy = new Set([
  "Notification",
  "NotificationRecipient",
  "OrderSequence",
  "Page",
  "Session",
  "User",
  "UserPage",
]);

const modelsWithoutDeletedBoolean = new Set([
  "Area",
  "BoxType",
  "Holiday",
  "ItemType",
  "Location",
  "MachineType",
  "Notification",
  "OrderSequence",
  "PalletType",
  "Position",
  "Section",
  "ShipmentType",
  "User",
]);

function buildSoftDeleteData(model?: string, explicitDeletedBy?: string | null) {
  const userId = explicitDeletedBy !== undefined ? explicitDeletedBy : (getCurrentUserId() ?? null);
  return {
    deletedAt: new Date(),
    ...(model && !modelsWithoutDeletedBy.has(model) && userId !== "SYSTEM"
      ? { deletedBy: userId }
      : {}),
    ...(model && !modelsWithoutDeletedBoolean.has(model) ? { deleted: true } : {}),
  };
}

function buildRestoreData(model?: string) {
  const userId = getCurrentUserId() ?? undefined;
  return {
    deletedAt: null,
    ...(model && !modelsWithoutDeletedBy.has(model) ? { deletedBy: null } : {}),
    ...(model && !modelsWithoutDeletedBoolean.has(model) ? { deleted: false } : {}),
    ...(model && !modelsWithoutUpdatedBy.has(model) && userId && userId !== "SYSTEM"
      ? { updatedBy: userId }
      : {}),
  };
}

/**
 * Prisma extension to enable soft delete by default.
 * - Automatically filters out records where `deletedAt` is not null on read queries.
 * - Converts `delete` and `deleteMany` operations into soft-delete `update` and `updateMany`.
 * - Automatically records `deletedBy` from the active authenticated user context.
 * - Exposes helper methods `restore()` and `hardDelete()` on models.
 */
export const softDeleteExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    name: "softDelete",
    query: {
      $allModels: {
        async findFirst({ model, args, query }) {
          if (model && nonSoftDeleteModels.has(model)) {
            return query(args);
          }
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }) {
          if (model && nonSoftDeleteModels.has(model)) {
            return query(args);
          }
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        async findMany({ model, args, query }) {
          if (model && nonSoftDeleteModels.has(model)) {
            return query(args);
          }
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (model && nonSoftDeleteModels.has(model)) {
            return query(args);
          }
          const { where, ...rest } = args as { where: Record<string, unknown> };
          return (client as Record<string, any>)[model].findFirst({
            where: { ...where, deletedAt: null },
            ...rest,
          });
        },
        async findUniqueOrThrow({ model, args, query }) {
          if (model && nonSoftDeleteModels.has(model)) {
            return query(args);
          }
          const { where, ...rest } = args as { where: Record<string, unknown> };
          return (client as Record<string, any>)[model].findFirstOrThrow({
            where: { ...where, deletedAt: null },
            ...rest,
          });
        },
        async count({ model, args, query }) {
          if (model && nonSoftDeleteModels.has(model)) {
            return query(args);
          }
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        async aggregate({ model, args, query }) {
          if (model && nonSoftDeleteModels.has(model)) {
            return query(args);
          }
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        async groupBy({ model, args, query }) {
          if (model && nonSoftDeleteModels.has(model)) {
            return query(args);
          }
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        async delete({ model, args, query }) {
          if (model && nonSoftDeleteModels.has(model)) {
            return query(args);
          }
          const deleteArgs = args as {
            where: Record<string, unknown>;
            select?: Record<string, unknown>;
            include?: Record<string, unknown>;
          };
          return (client as Record<string, any>)[model].update({
            where: deleteArgs.where,
            data: buildSoftDeleteData(model),
            select: deleteArgs.select,
            include: deleteArgs.include,
          });
        },
        async deleteMany({ model, args, query }) {
          if (model && nonSoftDeleteModels.has(model)) {
            return query(args);
          }
          const deleteManyArgs = args as { where?: Record<string, unknown> };
          return (client as Record<string, any>)[model].updateMany({
            where: { deletedAt: null, ...deleteManyArgs.where },
            data: buildSoftDeleteData(model),
          });
        },
      },
    },
    model: {
      $allModels: {
        /**
         * Restore a soft-deleted record by ID/unique key
         */
        async restore<T>(this: T, where: Record<string, unknown>) {
          const context = Prisma.getExtensionContext(this);
          const modelName = (context as any).$name ?? (context as any).name;
          return (context as Record<string, any>).update({
            where,
            data: buildRestoreData(modelName),
          });
        },
        /**
         * Hard delete a record bypassing soft delete
         */
        async hardDelete<T>(this: T, where: Record<string, unknown>) {
          const context = Prisma.getExtensionContext(this);
          const modelName = (context as any).$name ?? (context as any).name;
          return (client as Record<string, any>)[modelName].delete({
            where,
          });
        },
      },
    },
  });
});

