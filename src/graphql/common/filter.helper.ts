/**
 * Utility to convert GraphQL filter inputs into Prisma where clauses.
 */
export function buildPrismaWhere(
  filter?: Record<string, any> | null,
  searchFields: string[] = [],
): Record<string, any> {
  if (!filter) return {};

  const where: Record<string, any> = {};

  if (filter.search && searchFields.length > 0) {
    const searchVal = String(filter.search).trim();
    where.OR = searchFields.map((field) => ({
      [field]: { contains: searchVal, mode: "insensitive" },
    }));
  }

  for (const [key, value] of Object.entries(filter)) {
    if (key === "search" || value === undefined || value === null) continue;

    if (key === "AND" || key === "OR" || key === "NOT") {
      if (Array.isArray(value)) {
        where[key] = value.map((subFilter) =>
          buildPrismaWhere(subFilter, searchFields),
        );
      }
      continue;
    }

    if (typeof value === "object") {
      const cleanSub: Record<string, any> = {};
      for (const [op, opVal] of Object.entries(value)) {
        if (opVal !== undefined && opVal !== null) {
          if (op === "contains" || op === "startsWith" || op === "endsWith") {
            cleanSub[op] = opVal;
            cleanSub.mode = "insensitive";
          } else {
            cleanSub[op] = opVal;
          }
        }
      }
      if (Object.keys(cleanSub).length > 0) {
        where[key] = cleanSub;
      }
    } else {
      where[key] = value;
    }
  }

  return where;
}
