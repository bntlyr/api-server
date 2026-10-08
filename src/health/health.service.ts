import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { JavaService } from "../java-service/java-service.service.js";
import type { JavaServerHealth } from "../java-service/interfaces/java-service.interface.js";

export interface HealthCheckResult {
  status: "ok" | "error";
  timestamp: string;
  uptime: number;
  environment: string;
  version?: string;
  services: {
    database: {
      status: "up" | "down";
      latencyMs?: number;
      error?: string;
    };
    javaServer: JavaServerHealth;
    memory: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly javaService: JavaService
  ) {}

  async checkDatabase(): Promise<{ status: "up" | "down"; latencyMs?: number; error?: string }> {
    const start = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;
      return {
        status: "up",
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Database health check failed: ${errorMessage}`);
      return {
        status: "down",
        latencyMs,
        error: errorMessage,
      };
    }
  }

  async checkJavaServer(): Promise<JavaServerHealth> {
    return this.javaService.checkHealth();
  }

  async getHealth(): Promise<{ isHealthy: boolean; result: HealthCheckResult }> {
    const mem = process.memoryUsage();
    const [db, javaServer] = await Promise.all([
      this.checkDatabase(),
      this.checkJavaServer(),
    ]);

    const isHealthy = db.status === "up" && javaServer.status === "up";

    const result: HealthCheckResult = {
      status: isHealthy ? "ok" : "error",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      services: {
        database: db,
        javaServer,
        memory: {
          rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
          heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        },
      },
    };

    return { isHealthy, result };
  }
}
