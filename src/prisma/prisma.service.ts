import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { softDeleteExtension } from "./prisma.extension.js";

function createExtendedPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const basePrisma = new PrismaClient({ adapter });
  return basePrisma.$extends(softDeleteExtension);
}

const ExtendedPrismaClient = class {
  constructor() {
    return createExtendedPrismaClient();
  }
} as new () => ReturnType<typeof createExtendedPrismaClient>;

@Injectable()
export class PrismaService
  extends ExtendedPrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
