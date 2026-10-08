import type { PageInfo, PaginationInput } from "../../generated/graphql/types.js";

export interface PaginationResult<T> {
  edges: Array<{ cursor: string; node: T }>;
  nodes: T[];
  pageInfo: PageInfo;
  totalCount: number;
}

/**
 * Builds Prisma findMany arguments for forward/backward cursor pagination.
 */
export function getPrismaPaginationArgs(
  pagination?: PaginationInput | null,
  options?: { isNumericId?: boolean },
) {
  const first = pagination?.first ?? 20;
  const after = pagination?.after;

  const cursor = after
    ? ({ id: options?.isNumericId ? parseInt(after, 10) : after } as any)
    : undefined;

  return {
    take: first + 1,
    skip: after ? 1 : 0,
    cursor,
    limit: first,
  };
}

/**
 * Transforms raw Prisma results into a Relay-compliant connection.
 */
export function toConnection<T extends { id: string | number }>(
  items: T[],
  limit: number,
  totalCount: number,
  hasPreviousPage = false,
): PaginationResult<T> {
  const hasNextPage = items.length > limit;
  const nodes = (hasNextPage ? items.slice(0, limit) : items) as T[];

  const edges = nodes.map((node) => ({
    cursor: String(node.id),
    node,
  }));

  return {
    edges,
    nodes,
    pageInfo: {
      hasNextPage,
      hasPreviousPage,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    },
    totalCount,
  };
}
