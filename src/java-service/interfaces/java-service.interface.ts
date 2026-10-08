export interface ProcessTaskInput {
  taskId?: string;
  taskType: string;
  parameters?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ProcessTaskOutput {
  taskId: string;
  taskType: string;
  status: "SUCCESS" | "FAILED";
  executionDurationMs: number;
  result?: Record<string, any>;
  errorMessage?: string;
  completedAt: string;
}

export interface JavaServerHealth {
  status: "up" | "down";
  latencyMs?: number;
  details?: Record<string, any>;
  error?: string;
}
