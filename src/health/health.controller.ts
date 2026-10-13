import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";
import { HealthService } from "./health.service.js";
import { Public } from "../auth/guards/jwt-auth.guard.js";

@Public()
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(@Res({ passthrough: true }) res: Response) {
    const { isHealthy, result } = await this.healthService.getHealth();
    if (!isHealthy) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }

  @Get("live")
  getLiveness() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ready")
  async getReadiness(@Res({ passthrough: true }) res: Response) {
    const [db, javaServer] = await Promise.all([
      this.healthService.checkDatabase(),
      this.healthService.checkJavaServer(),
    ]);

    const isReady = db.status === "up" && javaServer.status === "up";
    if (!isReady) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return {
        status: "error",
        ready: false,
        database: db,
        javaServer,
      };
    }
    return {
      status: "ok",
      ready: true,
      database: db,
      javaServer,
    };
  }

  @Get("java")
  async getJavaHealth(@Res({ passthrough: true }) res: Response) {
    const javaServer = await this.healthService.checkJavaServer();
    if (javaServer.status !== "up") {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return javaServer;
  }
}
