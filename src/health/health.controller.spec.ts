import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpStatus } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";

describe("HealthController", () => {
  let controller: HealthController;

  const mockHealthService = {
    getHealth: vi.fn(),
    checkDatabase: vi.fn(),
    checkJavaServer: vi.fn(),
  };

  const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe("getHealth", () => {
    it("should return healthy payload with 200 default status", async () => {
      const res = mockResponse();
      const mockResult = {
        status: "ok" as const,
        timestamp: new Date().toISOString(),
        uptime: 10,
        environment: "test",
        services: {
          database: { status: "up" as const, latencyMs: 2 },
          javaServer: { status: "up" as const, latencyMs: 3 },
          memory: { rssMb: 50, heapUsedMb: 20, heapTotalMb: 40 },
        },
      };

      mockHealthService.getHealth.mockResolvedValueOnce({
        isHealthy: true,
        result: mockResult,
      });

      const response = await controller.getHealth(res);

      expect(response).toEqual(mockResult);
      expect(res.status).not.toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it("should set 503 status code when unhealthy", async () => {
      const res = mockResponse();
      const mockResult = {
        status: "error" as const,
        timestamp: new Date().toISOString(),
        uptime: 10,
        environment: "test",
        services: {
          database: { status: "down" as const, error: "Connection error" },
          javaServer: { status: "up" as const, latencyMs: 3 },
          memory: { rssMb: 50, heapUsedMb: 20, heapTotalMb: 40 },
        },
      };

      mockHealthService.getHealth.mockResolvedValueOnce({
        isHealthy: false,
        result: mockResult,
      });

      const response = await controller.getHealth(res);

      expect(response).toEqual(mockResult);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });

  describe("getLiveness", () => {
    it("should return ok status", () => {
      const result = controller.getLiveness();
      expect(result.status).toBe("ok");
      expect(result.timestamp).toBeDefined();
    });
  });

  describe("getReadiness", () => {
    it("should return ready true when database and javaServer are up", async () => {
      const res = mockResponse();
      mockHealthService.checkDatabase.mockResolvedValueOnce({
        status: "up",
        latencyMs: 1.5,
      });
      mockHealthService.checkJavaServer.mockResolvedValueOnce({
        status: "up",
        latencyMs: 2.0,
      });

      const result = await controller.getReadiness(res);

      expect(result.ready).toBe(true);
      expect(result.status).toBe("ok");
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should return 503 and ready false when database is down", async () => {
      const res = mockResponse();
      mockHealthService.checkDatabase.mockResolvedValueOnce({
        status: "down",
        error: "Timeout",
      });
      mockHealthService.checkJavaServer.mockResolvedValueOnce({
        status: "up",
        latencyMs: 2.0,
      });

      const result = await controller.getReadiness(res);

      expect(result.ready).toBe(false);
      expect(result.status).toBe("error");
      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });

  describe("getJavaHealth", () => {
    it("should return java server health", async () => {
      const res = mockResponse();
      mockHealthService.checkJavaServer.mockResolvedValueOnce({
        status: "up",
        latencyMs: 2.0,
      });

      const result = await controller.getJavaHealth(res);

      expect(result.status).toBe("up");
      expect(res.status).not.toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });
});
