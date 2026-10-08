import type { Request, Response } from "express";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { AuthenticatedUser } from "../auth/interfaces/auth.interface.js";

export interface GraphQLContext {
  req: Request & { user?: AuthenticatedUser };
  res: Response;
  prisma: PrismaService;
  user?: AuthenticatedUser;
}
