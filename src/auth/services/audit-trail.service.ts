import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";

export interface CreateAuditEntry {
  userId: string;
  action?: string;
  method?: string;
  tableName?: string;
  recordId?: string;
  description?: string;
  values?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent: string;
}

@Injectable()
export class AuditTrailService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: CreateAuditEntry) {
    try {
      return await this.prisma.auditTrail.create({
        data: {
          userId: entry.userId,
          action: entry.action ?? null,
          method: entry.method ?? null,
          tableName: entry.tableName ?? null,
          recordId: entry.recordId ?? null,
          description: entry.description ?? null,
          values: entry.values ? JSON.stringify(entry.values) : "{}",
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : "{}",
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent || "Unknown",
        },
      });
    } catch (error) {
      // Do not block main execution if audit log fails, but log the error
      console.error("Failed to write audit trail:", error);
      return null;
    }
  }
}
