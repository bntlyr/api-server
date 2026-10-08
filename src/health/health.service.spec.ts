import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HealthService } from "./health.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { JavaService } from "../java-service/java-service.service.js";

describe("HealthService", () => {
  let service: HealthService;

  const mockPrisma = {
    $queryRaw: vi.fn(),
  };

  const mockJavaService = {
    checkHealth: vi.fn(),
    processTask: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: JavaService,
          useValue: mockJavaService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  describe("checkDatabase", () => {
    it("should return status 'up' when database query succeeds", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ health: 1 }]);

      const result = await service.checkDatabase();

      expect(result.status).toBe("up");
      expect(typeof result.latencyMs).toBe("number");
      expect(result.error).toBeUndefined();
    });

    it("should return status 'down' when database query fails", async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await service.checkDatabase();

      expect(result.status).toBe("down");
      expect(result.error).toContain("Connection refused");
    });
  });

  describe("checkJavaServer", () => {
    it("should return status 'up' when java server is reachable", async () => {
      mockJavaService.checkHealth.mockResolvedValueOnce({
        status: "up",
        latencyMs: 3.5,
      });

      const result = await service.checkJavaServer();

      expect(result.status).toBe("up");
      expect(result.latencyMs).toBe(3.5);
    });
  });

  describe("getHealth", () => {
    it("should return isHealthy true and ok status when DB and Java server are healthy", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ health: 1 }]);
      mockJavaService.checkHealth.mockResolvedValueOnce({
        status: "up",
        latencyMs: 2.1,
      });

      const { isHealthy, result } = await service.getHealth();

      expect(isHealthy).toBe(true);
      expect(result.status).toBe("ok");
      expect(result.services.database.status).toBe("up");
      expect(result.services.javaServer.status).toBe("up");
      expect(result.services.memory.heapUsedMb).toBeGreaterThan(0);
    });

    it("should return isHealthy false and error status when DB is down", async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error("DB Down"));
      mockJavaService.checkHealth.mockResolvedValueOnce({
        status: "up",
        latencyMs: 2.1,
      });

      const { isHealthy, result } = await service.getHealth();

      expect(isHealthy).toBe(false);
      expect(result.status).toBe("error");
      expect(result.services.database.status).toBe("down");
    });

    it("should return isHealthy false when Java server is down", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ health: 1 }]);
      mockJavaService.checkHealth.mockResolvedValueOnce({
        status: "down",
        error: "Connection refused",
      });

      const { isHealthy, result } = await service.getHealth();

      expect(isHealthy).toBe(false);
      expect(result.status).toBe("error");
      expect(result.services.javaServer.status).toBe("down");
    });
  });
});
