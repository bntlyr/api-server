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

export interface RouteStepDto {
  stepNo?: number;
  processId?: number;
  processName?: string;
  leadTime?: number;
  leadTimeUnit?: string;
  prepTime?: number;
  prepTimeUnit?: string;
  cureTime?: number;
  cureTimeUnit?: string;
  durationType?: string;
  hasPacking?: boolean;
  maxPcsPerDay?: number;
  maxWeightPerDay?: number;
  qtyPerTree?: number;
  qtyPerShot?: number;
}

export interface DailyLoadDto {
  date: string;
  processId: number;
  processName: string;
  scheduledPcs: number;
  scheduledWeight: number;
}

export interface CapacityWarningDto {
  requestedDate: string;
  adjustedDate: string;
  processId: number;
  processName: string;
  lotNo: string;
  message: string;
  requestedPcs: number;
  maxPcsPerDay: number;
  requestedWeight: number;
  maxWeightPerDay: number;
}

export interface ScheduledProcessDto {
  stepNo: number;
  processId: number;
  processName: string;
  itemCode?: string;
  isFabrication: boolean;
  scheduledStartDate: string;
  scheduledEndDate: string;
  leadTime: number;
  productionTime: number;
  neededQty: number;
  previousStepNo?: number;
  nextStepNos: number[];
}

export interface ScheduledSlipDto {
  lotNo: string;
  orderNo: string;
  type: string;
  totalQty: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  fabStartDate?: string;
  fabEndDate?: string;
  fabTotalDays?: number;
  processes: ScheduledProcessDto[];
}

export interface ScheduleRequest {
  orderNo: string;
  salesOrderId: number;
  itemCode: string;
  orderQty: number;
  allocatedQty: number;
  rejectionRate: number;
  autoSplitQty: number;
  stdItemWt: number;
  castingWt: number;
  requestedEtd?: string;
  startDateOverride?: string;
  maxConcurrentLots?: number;
  includeSaturday?: boolean;
  maxWorkingHoursPerDay?: number;
  holidays?: string[];
  existingLoads?: DailyLoadDto[];
  itemRoutes?: RouteStepDto[];
  hasFabrication?: boolean;
  fabCode?: string;
  fabRoutes?: RouteStepDto[];
}

export interface ScheduleResponse {
  orderNo: string;
  salesOrderId: number;
  productionId: string;
  netRequiredQty: number;
  totalProductionQty: number;
  lotCount: number;
  requestedEtd?: string;
  targetEndDate?: string;
  scheduledStartDate: string;
  scheduledEndDate: string;
  totalWorkingDays: number;
  isDelayed: boolean;
  delayWorkingDays: number;
  schedulingMode: string;
  slips: ScheduledSlipDto[];
  resultingLoads: DailyLoadDto[];
  capacityWarnings: CapacityWarningDto[];
}

export interface ProductionSlipTableInfoDto {
  id?: number;
  processName: string;
  startDate?: string;
  actualStartDate?: string;
  endDate?: string;
  actualEndDate?: string;
  personInCharge?: string;
  rejectedQty?: number;
  passedQty?: number;
  remarks?: string;
}

export interface PrintProductionSlipRequestDto {
  slipId?: number;
  type?: string;
  requestedETD?: string;
  itemCode?: string;
  orderNo?: string;
  orderQty?: number;
  rawMaterial?: string;
  chargeNo?: string;
  trialLotNo?: string;
  boxLayer?: string;
  plasticSize?: string;
  plasticQty?: number;
  topLayerQty?: number;
  btmLayerQty?: number;
  maxQty?: number;
  maxWt?: number;
  packingRemarks?: string;
  imageUrl?: string;
  productionQty?: string;
  scheduledTrees?: string;
  coatingPattern?: string;
  treeMark?: string;
  similarProducts?: string;
  castingTemp?: number;
  moldTemp?: number;
  castingWt?: number;
  pcsPerTree?: number;
  slipSize?: string;
  trialRemarks?: string;
  salesRemarks?: string;
  qrCode?: string;
  reworkLotNo?: string;
  createdBy?: string;
  watermarkText?: string;
  processTableDetails?: ProductionSlipTableInfoDto[];
}

export interface PrintTrialCardRequestDto {
  itemId?: number;
  slipId?: number;
  type?: string;
  createdAt?: string;
  trialLotNo?: string;
  itemCode?: string;
  rawMaterial?: string;
  trialPurpose?: string;
  trialProcess?: string;
  orderNo?: string;
  lotNo?: string;
  watermarkText?: string;
}

export interface PrintReportResponseDto {
  success: boolean;
  filename?: string;
  downloadUrl?: string;
  relativePath?: string;
  fileSize?: number;
  durationMs?: number;
  errorMessage?: string;
}

