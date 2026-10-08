import { Prisma } from "../generated/prisma/client.js";

/**
 * Prisma extension to enable soft delete by default.
 * - Automatically filters out records where `deletedAt` is not null on read queries.
 * - Converts `delete` and `deleteMany` operations into soft-delete `update` and `updateMany`.
 * - Exposes helper methods `restore()` and `hardDelete()` on models.
 */
export const softDeleteExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    name: "softDelete",
    query: {
      $allModels: {
        async findFirst({ args, query }) {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        async findFirstOrThrow({ args, query }) {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        async findMany({ args, query }) {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        async findUnique({ model, args }) {
          const { where, ...rest } = args as { where: Record<string, unknown> };
          return (client as Record<string, any>)[model].findFirst({
            where: { ...where, deletedAt: null },
            ...rest,
          });
        },
        async findUniqueOrThrow({ model, args }) {
          const { where, ...rest } = args as { where: Record<string, unknown> };
          return (client as Record<string, any>)[model].findFirstOrThrow({
            where: { ...where, deletedAt: null },
            ...rest,
          });
        },
        async count({ args, query }) {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        async aggregate({ args, query }) {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        async groupBy({ args, query }) {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        async delete({ model, args }) {
          const deleteArgs = args as {
            where: Record<string, unknown>;
            select?: Record<string, unknown>;
            include?: Record<string, unknown>;
          };
          return (client as Record<string, any>)[model].update({
            where: deleteArgs.where,
            data: { deletedAt: new Date() },
            select: deleteArgs.select,
            include: deleteArgs.include,
          });
        },
        async deleteMany({ model, args }) {
          const deleteManyArgs = args as { where?: Record<string, unknown> };
          return (client as Record<string, any>)[model].updateMany({
            where: { deletedAt: null, ...deleteManyArgs.where },
            data: { deletedAt: new Date() },
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
          return (context as Record<string, any>).update({
            where,
            data: { deletedAt: null },
          });
        },
        /**
         * Hard delete a record bypassing soft delete
         */
        async hardDelete<T>(this: T, where: Record<string, unknown>) {
          const context = Prisma.getExtensionContext(this);
          return (client as Record<string, any>)[(context as any).name].delete({
            where,
          });
        },
      },
    },
  });
});
