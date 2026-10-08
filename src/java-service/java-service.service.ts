import { Injectable, Logger } from "@nestjs/common";
import type {
  JavaServerHealth,
  ProcessTaskInput,
  ProcessTaskOutput,
} from "./interfaces/java-service.interface.js";

@Injectable()
export class JavaService {
  private readonly logger = new Logger(JavaService.name);
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor() {
    this.baseUrl = (process.env.JAVA_SERVER_URL || "http://localhost:8080").replace(/\/+$/, "");
    this.secret = process.env.INTERNAL_API_SECRET || "bently-internal-secret-key";
  }

  async checkHealth(): Promise<JavaServerHealth> {
    const start = performance.now();
    try {
      const response = await fetch(`${this.baseUrl}/actuator/health`, {
        method: "GET",
        signal: AbortSignal.timeout(4000),
      });

      const latencyMs = Math.round((performance.now() - start) * 100) / 100;

      if (!response.ok) {
        return {
          status: "down",
          latencyMs,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const body = (await response.json()) as Record<string, any>;
      const isUp = body.status === "UP";

      return {
        status: isUp ? "up" : "down",
        latencyMs,
        details: body,
      };
    } catch (error) {
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Java microservice health check failed: ${errorMessage}`);
      return {
        status: "down",
        latencyMs,
        error: errorMessage,
      };
    }
  }

  async processTask(input: ProcessTaskInput): Promise<ProcessTaskOutput> {
    const url = `${this.baseUrl}/api/v1/process`;
    this.logger.log(`Dispatching heavy task [${input.taskType}] to Java microservice: ${url}`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": this.secret,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Java microservice task failed HTTP ${response.status}: ${errorText}`);
        return {
          taskId: input.taskId || "",
          taskType: input.taskType,
          status: "FAILED",
          executionDurationMs: 0,
          errorMessage: `Microservice error (${response.status}): ${errorText}`,
          completedAt: new Date().toISOString(),
        };
      }

      return (await response.json()) as ProcessTaskOutput;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error communicating with Java microservice: ${errorMessage}`);
      return {
        taskId: input.taskId || "",
        taskType: input.taskType,
        status: "FAILED",
        executionDurationMs: 0,
        errorMessage,
        completedAt: new Date().toISOString(),
      };
    }
  }
}
