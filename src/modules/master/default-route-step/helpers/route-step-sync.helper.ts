import type { RouteStepItemInput } from "../../../../generated/graphql/types.js";

interface ProcessEnrichment {
  id: number;
  name: string;
  sectionId: number | null;
  hasMachining: boolean;
  hasIterating: boolean;
  hasChecking: boolean;
  hasRework: boolean;
  hasPacking: boolean;
  hasTooling: boolean;
  hasActualParameter: boolean;
  durationType: string;
  leadTime: any;
  leadTimeUnit: string;
  prepTime: any;
  prepTimeUnit: string | null;
  cureTime: any;
  cureTimeUnit: string | null;
  machineIds: number[];
  iterations: string[];
}

async function loadProcessEnrichmentMap(
  tx: any,
  steps: RouteStepItemInput[],
): Promise<Map<number, ProcessEnrichment>> {
  const processIds = Array.from(
    new Set(
      steps
        .map((s) => s.processId)
        .filter((id): id is number => id != null && Number.isInteger(id) && id > 0),
    ),
  );

  const map = new Map<number, ProcessEnrichment>();
  if (processIds.length === 0) return map;

  const processes = await tx.process.findMany({
    where: { id: { in: processIds } },
    include: {
      processMachinings: { where: { deletedAt: null } },
      processIterations: { where: { deletedAt: null }, orderBy: { id: "asc" } },
    },
  });

  for (const p of processes) {
    map.set(p.id, {
      id: p.id,
      name: p.name,
      sectionId: p.sectionId ?? null,
      hasMachining: Boolean(p.hasMachining),
      hasIterating: Boolean(p.hasIterating),
      hasChecking: Boolean(p.hasChecking),
      hasRework: Boolean(p.hasRework),
      hasPacking: Boolean(p.hasPacking),
      hasTooling: Boolean(p.hasTooling),
      hasActualParameter: Boolean(p.hasActualParameter),
      durationType: p.durationType || "Batch",
      leadTime: p.leadTime,
      leadTimeUnit: p.leadTimeUnit || "Minutes",
      prepTime: p.prepTime,
      prepTimeUnit: p.prepTimeUnit ?? "Minutes",
      cureTime: p.cureTime,
      cureTimeUnit: p.cureTimeUnit ?? "Hours",
      machineIds: (p.processMachinings ?? []).map((pm: any) => pm.machineId),
      iterations: (p.processIterations ?? []).map((pi: any) => pi.subname),
    });
  }

  return map;
}

function buildStepPayload(
  step: RouteStepItemInput,
  proc: ProcessEnrichment | undefined,
  actorId: string | null,
) {
  const machineIds =
    step.machineIds !== undefined && step.machineIds !== null
      ? step.machineIds
      : (proc?.machineIds ?? []);
  const iterations =
    step.iterations !== undefined && step.iterations !== null
      ? step.iterations
      : (proc?.iterations ?? []);

  return {
    data: {
      sequenceNumber: step.sequenceNumber,
      name: step.name || proc?.name || "",
      subname: step.subname ?? "",
      isParent: step.isParent != null ? step.isParent : true,
      processId: step.processId ?? null,
      sectionId: step.sectionId !== undefined ? step.sectionId : (proc?.sectionId ?? null),
      numberOfIterations:
        step.numberOfIterations != null
          ? step.numberOfIterations
          : iterations.length > 0
            ? Math.min(iterations.length, 10)
            : 0,
      hasMachining:
        step.hasMachining != null
          ? step.hasMachining
          : proc
            ? proc.hasMachining
            : machineIds.length > 0,
      hasIterating:
        step.hasIterating != null
          ? step.hasIterating
          : proc
            ? proc.hasIterating
            : iterations.length > 0,
      hasChecking: step.hasChecking != null ? step.hasChecking : (proc?.hasChecking ?? false),
      hasRework: step.hasRework != null ? step.hasRework : (proc?.hasRework ?? false),
      hasPacking: step.hasPacking != null ? step.hasPacking : (proc?.hasPacking ?? false),
      hasTooling: step.hasTooling != null ? step.hasTooling : (proc?.hasTooling ?? false),
      hasActualParameter:
        step.hasActualParameter != null
          ? step.hasActualParameter
          : (proc?.hasActualParameter ?? false),
      durationType: step.durationType || proc?.durationType || "Batch",
      leadTime: step.leadTime != null ? step.leadTime : Number(proc?.leadTime ?? 0),
      leadTimeUnit: step.leadTimeUnit || proc?.leadTimeUnit || "Minutes",
      prepTime: step.prepTime != null ? step.prepTime : Number(proc?.prepTime ?? 0),
      prepTimeUnit: step.prepTimeUnit || proc?.prepTimeUnit || "Minutes",
      cureTime: step.cureTime != null ? step.cureTime : Number(proc?.cureTime ?? 0),
      cureTimeUnit: step.cureTimeUnit || proc?.cureTimeUnit || "Hours",
      createdBy: actorId,
      updatedBy: actorId,
    },
    machineIds,
    iterations: iterations.slice(0, 10),
    parameters: step.parameters ?? [],
  };
}

export async function syncDefaultRouteSteps(
  tx: any,
  defaultRouteId: number,
  steps: RouteStepItemInput[],
  userId?: string | null,
) {
  const actorId = userId && userId !== "SYSTEM" ? userId : null;
  const existingSteps = await tx.defaultRouteStep.findMany({
    where: { defaultRouteId },
    select: { id: true },
  });
  const existingIds = existingSteps.map((s: { id: number }) => s.id);
  if (existingIds.length > 0) {
    await tx.defaultRouteParameter.deleteMany({ where: { defaultRouteStepId: { in: existingIds } } });
    await tx.defaultRouteIteration.deleteMany({ where: { defaultRouteStepId: { in: existingIds } } });
    await tx.defaultRouteMachining.deleteMany({ where: { defaultRouteStepId: { in: existingIds } } });
    await tx.defaultRouteStep.deleteMany({ where: { id: { in: existingIds } } });
  }

  const procMap = await loadProcessEnrichmentMap(tx, steps);

  for (const step of steps) {
    const proc = step.processId ? procMap.get(step.processId) : undefined;
    const { data, machineIds, iterations, parameters } = buildStepPayload(step, proc, actorId);
    const createdStep = await tx.defaultRouteStep.create({
      data: {
        ...data,
        defaultRouteId,
      },
    });

    if (machineIds.length > 0) {
      await tx.defaultRouteMachining.createMany({
        data: machineIds.map((machineId) => ({
          defaultRouteStepId: createdStep.id,
          machineId,
          createdBy: actorId,
          updatedBy: actorId,
        })),
        skipDuplicates: true,
      });
    }

    if (iterations.length > 0) {
      await tx.defaultRouteIteration.createMany({
        data: iterations.map((subname) => ({
          defaultRouteStepId: createdStep.id,
          subname,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      });
    }

    if (parameters.length > 0) {
      await tx.defaultRouteParameter.createMany({
        data: parameters.map((p) => ({
          defaultRouteStepId: createdStep.id,
          name: p.name,
          inputType: p.inputType || "Text",
          paramValue: p.paramValue ?? null,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      });
    }
  }
}

export async function syncItemRouteSteps(
  tx: any,
  itemRouteId: number,
  steps: RouteStepItemInput[],
  userId?: string | null,
) {
  const actorId = userId && userId !== "SYSTEM" ? userId : null;
  const existingSteps = await tx.itemRouteStep.findMany({
    where: { itemRouteId },
    select: { id: true },
  });
  const existingIds = existingSteps.map((s: { id: number }) => s.id);
  if (existingIds.length > 0) {
    await tx.itemRouteParameter.deleteMany({ where: { itemRouteStepId: { in: existingIds } } });
    await tx.itemRouteIteration.deleteMany({ where: { itemRouteStepId: { in: existingIds } } });
    await tx.itemRouteMachining.deleteMany({ where: { itemRouteStepId: { in: existingIds } } });
    await tx.itemRouteStep.deleteMany({ where: { id: { in: existingIds } } });
  }

  const procMap = await loadProcessEnrichmentMap(tx, steps);

  for (const step of steps) {
    const proc = step.processId ? procMap.get(step.processId) : undefined;
    const { data, machineIds, iterations, parameters } = buildStepPayload(step, proc, actorId);
    const createdStep = await tx.itemRouteStep.create({
      data: {
        ...data,
        itemRouteId,
      },
    });

    if (machineIds.length > 0) {
      await tx.itemRouteMachining.createMany({
        data: machineIds.map((machineId) => ({
          itemRouteStepId: createdStep.id,
          machineId,
          createdBy: actorId,
          updatedBy: actorId,
        })),
        skipDuplicates: true,
      });
    }

    if (iterations.length > 0) {
      await tx.itemRouteIteration.createMany({
        data: iterations.map((subname) => ({
          itemRouteStepId: createdStep.id,
          subname,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      });
    }

    if (parameters.length > 0) {
      await tx.itemRouteParameter.createMany({
        data: parameters.map((p) => ({
          itemRouteStepId: createdStep.id,
          name: p.name,
          inputType: p.inputType || "Text",
          paramValue: p.paramValue ?? null,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      });
    }
  }
}

export async function syncFabRouteSteps(
  tx: any,
  fabRouteId: number,
  steps: RouteStepItemInput[],
  userId?: string | null,
) {
  const actorId = userId && userId !== "SYSTEM" ? userId : null;
  const existingSteps = await tx.fabRouteStep.findMany({
    where: { fabRouteId },
    select: { id: true },
  });
  const existingIds = existingSteps.map((s: { id: number }) => s.id);
  if (existingIds.length > 0) {
    await tx.fabRouteParameter.deleteMany({ where: { fabRouteStepId: { in: existingIds } } });
    await tx.fabRouteIteration.deleteMany({ where: { fabRouteStepId: { in: existingIds } } });
    await tx.fabRouteMachining.deleteMany({ where: { fabRouteStepId: { in: existingIds } } });
    await tx.fabRouteStep.deleteMany({ where: { id: { in: existingIds } } });
  }

  const procMap = await loadProcessEnrichmentMap(tx, steps);

  for (const step of steps) {
    const proc = step.processId ? procMap.get(step.processId) : undefined;
    const { data, machineIds, iterations, parameters } = buildStepPayload(step, proc, actorId);
    const createdStep = await tx.fabRouteStep.create({
      data: {
        ...data,
        fabRouteId,
      },
    });

    if (machineIds.length > 0) {
      await tx.fabRouteMachining.createMany({
        data: machineIds.map((machineId) => ({
          fabRouteStepId: createdStep.id,
          machineId,
          createdBy: actorId,
          updatedBy: actorId,
        })),
        skipDuplicates: true,
      });
    }

    if (iterations.length > 0) {
      await tx.fabRouteIteration.createMany({
        data: iterations.map((subname) => ({
          fabRouteStepId: createdStep.id,
          subname,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      });
    }

    if (parameters.length > 0) {
      await tx.fabRouteParameter.createMany({
        data: parameters.map((p) => ({
          fabRouteStepId: createdStep.id,
          name: p.name,
          inputType: p.inputType || "Text",
          paramValue: p.paramValue ?? null,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      });
    }
  }
}

export async function copyDefaultRouteToItem(
  tx: any,
  itemTypeId: number,
  itemId: number,
  itemCode: string,
  userId?: string | null,
) {
  const actorId = userId && userId !== "SYSTEM" ? userId : null;
  const itemType = await tx.itemType.findUnique({
    where: { id: itemTypeId },
    include: {
      defaultRoute: {
        include: {
          steps: {
            where: { deletedAt: null },
            orderBy: { id: "asc" },
            include: {
              parameters: { where: { deletedAt: null }, orderBy: { id: "asc" } },
              iterations: { where: { deletedAt: null }, orderBy: { id: "asc" } },
              machinings: { where: { deletedAt: null } },
            },
          },
        },
      },
    },
  });

  if (!itemType?.routeSetUp || !itemType.defaultRoute || itemType.defaultRoute.deletedAt) {
    return;
  }

  const createdRoute = await tx.itemRoute.create({
    data: {
      name: `${itemCode} Route`,
      type: "Default",
      itemId,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  for (const step of itemType.defaultRoute.steps ?? []) {
    const createdStep = await tx.itemRouteStep.create({
      data: {
        sequenceNumber: step.sequenceNumber,
        name: step.name,
        subname: step.subname,
        isParent: step.isParent,
        processId: step.processId,
        sectionId: step.sectionId,
        numberOfIterations: step.numberOfIterations,
        hasMachining: step.hasMachining,
        hasIterating: step.hasIterating,
        hasChecking: step.hasChecking,
        hasRework: step.hasRework,
        hasPacking: step.hasPacking,
        hasTooling: step.hasTooling,
        hasActualParameter: step.hasActualParameter,
        durationType: step.durationType,
        leadTime: step.leadTime,
        leadTimeUnit: step.leadTimeUnit,
        prepTime: step.prepTime,
        prepTimeUnit: step.prepTimeUnit,
        cureTime: step.cureTime,
        cureTimeUnit: step.cureTimeUnit,
        maxPcsPerDay: step.maxPcsPerDay,
        maxWeightPerDay: step.maxWeightPerDay,
        qtyPerTree: step.qtyPerTree,
        qtyPerShot: step.qtyPerShot,
        itemRouteId: createdRoute.id,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });

    if (step.parameters?.length > 0) {
      await tx.itemRouteParameter.createMany({
        data: step.parameters.map((p: any) => ({
          itemRouteStepId: createdStep.id,
          name: p.name,
          inputType: p.inputType,
          paramValue: p.paramValue,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      });
    }

    if (step.iterations?.length > 0) {
      await tx.itemRouteIteration.createMany({
        data: step.iterations.map((it: any) => ({
          itemRouteStepId: createdStep.id,
          subname: it.subname,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      });
    }

    if (step.machinings?.length > 0) {
      await tx.itemRouteMachining.createMany({
        data: step.machinings.map((m: any) => ({
          itemRouteStepId: createdStep.id,
          machineId: m.machineId,
          createdBy: actorId,
          updatedBy: actorId,
        })),
        skipDuplicates: true,
      });
    }
  }
}
