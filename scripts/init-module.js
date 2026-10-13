#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: npx init <ModelName> [or npm run init <ModelName>]");
  console.error("Example: npx init Customer");
  process.exit(1);
}

const rawInput = args[0].trim();
const base = basename(rawInput, ".prisma");

function toPascalCase(str) {
  return str
    .replace(/[-_ ]+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase());
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function pluralize(str) {
  if (str.endsWith("y") && !/[aeiou]y$/i.test(str)) {
    return str.slice(0, -1) + "ies";
  }
  if (str.endsWith("s") || str.endsWith("x") || str.endsWith("z") || str.endsWith("ch") || str.endsWith("sh")) {
    return str + "es";
  }
  return str + "s";
}

const modelName = toPascalCase(base);
const camelName = toCamelCase(base);
const kebabName = toKebabCase(base);
const pluralCamelName = pluralize(camelName);

// 1. Locate and parse the Prisma schema for this model
const prismaFilePath = resolve(process.cwd(), `prisma/schema/${modelName}.prisma`);

if (!existsSync(prismaFilePath)) {
  console.error(`Error: Prisma model file not found at ${prismaFilePath}`);
  console.error(`Please create the Prisma schema first (e.g. npm run add ${modelName}.prisma)`);
  process.exit(1);
}

const prismaContent = readFileSync(prismaFilePath, "utf-8");

function parsePrismaModel(content) {
  const lines = content.split("\n");
  const fields = [];
  const standardTypes = ["String", "Int", "Float", "Boolean", "DateTime", "Json", "BigInt", "Decimal"];
  const auditFieldNames = [
    "createdAt",
    "createdBy",
    "createdById",
    "updatedAt",
    "updatedBy",
    "updatedById",
    "deletedAt",
    "deletedBy",
    "deleted",
  ];

  let inModel = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!inModel) {
      if (line.startsWith(`model ${modelName}`)) {
        inModel = true;
      }
      continue;
    }

    if (line.startsWith("}")) {
      break;
    }

    // Skip empty lines, comments, directives
    if (!line || line.startsWith("//") || line.startsWith("@@")) {
      continue;
    }

    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;

    const [fieldName, rawType, ...rest] = tokens;
    const isOptional = rawType.endsWith("?");
    const cleanType = rawType.replace("?", "").replace("[]", "");

    const isId = rest.some((r) => r.startsWith("@id"));
    const isUnique = rest.some((r) => r.startsWith("@unique"));
    const hasDefault = rest.some((r) => r.startsWith("@default"));
    const isAudit = auditFieldNames.includes(fieldName);
    const isRelation = !standardTypes.includes(cleanType);

    if (isRelation) {
      continue;
    }

    let gqlType = "String";
    let filterType = "StringFilterInput";
    if (isId) {
      gqlType = "ID";
      filterType = cleanType === "Int" ? "IntFilterInput" : "StringFilterInput";
    } else if (cleanType === "Int") {
      gqlType = "Int";
      filterType = "IntFilterInput";
    } else if (cleanType === "Float" || cleanType === "Decimal") {
      gqlType = "Float";
      filterType = "FloatFilterInput";
    } else if (cleanType === "Boolean") {
      gqlType = "Boolean";
      filterType = "BooleanFilterInput";
    } else if (cleanType === "DateTime") {
      gqlType = "DateTime";
      filterType = "DateTimeFilterInput";
    } else {
      gqlType = "String";
      filterType = "StringFilterInput";
    }

    fields.push({
      name: fieldName,
      type: cleanType,
      gqlType,
      filterType,
      isOptional,
      isId,
      isUnique,
      hasDefault,
      isAudit,
      isRelation,
    });
  }

  return fields;
}

const parsedFields = parsePrismaModel(prismaContent);
const idField = parsedFields.find((f) => f.isId) || { name: "id", type: "Int", gqlType: "ID", isOptional: false };
const isNumericId = idField.type === "Int" || idField.type === "BigInt";
const hasField = (name) => parsedFields.some((f) => f.name === name);

// Editable fields for Create (exclude ID and all audit/soft-delete fields)
const createFields = parsedFields.filter((f) => !f.isId && !f.isAudit);

// Editable fields for Update (exclude ID and all audit/soft-delete fields)
const updateFields = parsedFields.filter((f) => !f.isId && !f.isAudit);

// Searchable string fields (e.g. title, content, email, name)
const stringFields = parsedFields.filter((f) => f.type === "String" && !f.isAudit);
const searchFieldNames = stringFields.map((f) => f.name);

// 2. Output generated GraphQL schema to gitignored directory: src/generated/graphql/schemas/
const generatedSchemaDir = resolve(process.cwd(), "src/generated/graphql/schemas");
mkdirSync(generatedSchemaDir, { recursive: true });

const modelGqlFields = parsedFields
  .map((f) => `  ${f.name}: ${f.gqlType}${f.isOptional ? "" : "!"}`)
  .join("\n");

const filterGqlFields = parsedFields
  .map((f) => `  ${f.name}: ${f.filterType}`)
  .join("\n");

const createGqlFields = createFields
  .map((f) => {
    const isRequired = !f.isOptional && !f.hasDefault;
    return `  ${f.name}: ${f.gqlType}${isRequired ? "!" : ""}`;
  })
  .join("\n");

const updateGqlFields = updateFields
  .map((f) => `  ${f.name}: ${f.gqlType}`)
  .join("\n");

const graphqlContent = `type ${modelName} {
${modelGqlFields}
}

"""
Filter input for querying ${pluralCamelName}
"""
input ${modelName}FilterInput {
  search: String
${filterGqlFields}
  AND: [${modelName}FilterInput!]
  OR: [${modelName}FilterInput!]
  NOT: [${modelName}FilterInput!]
}

input Create${modelName}Input {
${createGqlFields}
}

input Update${modelName}Input {
${updateGqlFields}
}

type ${modelName}Payload {
  ${camelName}: ${modelName}
  userErrors: [UserError!]!
}

type ${modelName}Edge {
  cursor: String!
  node: ${modelName}!
}

type ${modelName}Connection {
  edges: [${modelName}Edge!]!
  nodes: [${modelName}!]!
  pageInfo: PageInfo!
  totalCount: Int!
  userErrors: [UserError!]!
}

type Query {
  ${camelName}ById(id: ID!): ${modelName}
  ${pluralCamelName}Paginated(
    pagination: PaginationInput
    filter: ${modelName}FilterInput
  ): ${modelName}Connection!
}

type Mutation {
  create${modelName}(input: Create${modelName}Input!): ${modelName}Payload!
  update${modelName}(id: ID!, input: Update${modelName}Input!): ${modelName}Payload!
  delete${modelName}(id: ID!): ${modelName}Payload!
  restore${modelName}(id: ID!): ${modelName}Payload!
}
`;

const schemaFilePath = resolve(generatedSchemaDir, `${kebabName}.generated.graphql`);
writeFileSync(schemaFilePath, graphqlContent, "utf-8");
console.log(`📄 Generated base schema at src/generated/graphql/schemas/${kebabName}.generated.graphql`);

// 3. Module directory structure: src/modules/master/<kebabName>/ (with resolvers/ and helpers/ subdirectories)
function findOrCreateModuleDir(kebab) {
  const base = resolve(process.cwd(), "src/modules");
  if (existsSync(resolve(base, "master", kebab))) return resolve(base, "master", kebab);
  if (existsSync(resolve(base, "common", kebab))) return resolve(base, "common", kebab);
  if (existsSync(resolve(base, "inventory", kebab))) return resolve(base, "inventory", kebab);
  if (existsSync(resolve(base, kebab))) return resolve(base, kebab);
  return resolve(base, "master", kebab);
}

const moduleDir = findOrCreateModuleDir(kebabName);
const resolversDir = resolve(moduleDir, "resolvers");
const helpersDir = resolve(moduleDir, "helpers");

mkdirSync(moduleDir, { recursive: true });
mkdirSync(resolversDir, { recursive: true });
mkdirSync(helpersDir, { recursive: true });

// TypeDefs Extend files (.graphql and .ts)
const typedefsExtendGqlContent = `#graphql
# Use this file to define SDL schema extensions or relation extensions for ${modelName}.
# extend type ${modelName} {
# }
`;

const typedefsExtendTsContent = `/**
 * Use this file to define SDL schema extensions or relation extensions for ${modelName}.
 * E.g., extend type ${modelName} with relations to other models.
 */
export const ${camelName}TypeDefsExtend = \`#graphql
  # extend type ${modelName} {
  # }
\`;
`;

// Helper
const requiredCreateFields = createFields.filter(
  (f) => !f.isOptional && !f.hasDefault
);

const validationChecks = requiredCreateFields
  .map((f) => {
    if (f.gqlType === "String") {
      return `  if (!input.${f.name} || input.${f.name}.trim() === "") {\n    return "${f.name} is required";\n  }`;
    }
    return `  if (input.${f.name} === undefined || input.${f.name} === null) {\n    return "${f.name} is required";\n  }`;
  })
  .join("\n");

const helperContent = `import type { Create${modelName}Input, Update${modelName}Input } from "../../../../generated/graphql/types.js";

/**
 * Domain helper functions for the ${modelName} module.
 */
export function validateCreate${modelName}Input(input: Create${modelName}Input): string | null {
${validationChecks || "  return null;"}
  return null;
}

export function validateUpdate${modelName}Input(_input: Update${modelName}Input): string | null {
  return null;
}
`;

// Service
const createAuditLines = [
  ...(hasField("createdBy") ? [`          createdBy: userId,`] : []),
  ...(hasField("createdById") ? [`          createdById: userId,`] : []),
  ...(hasField("updatedBy") ? [`          updatedBy: userId,`] : []),
  ...(hasField("updatedById") ? [`          updatedById: userId,`] : []),
];

const createDataFields = [
  ...createFields.map((f) => {
    if (f.isOptional) {
      return `          ${f.name}: input.${f.name} ?? null,`;
    }
    if (f.hasDefault) {
      return `          ...(input.${f.name} != null ? { ${f.name}: input.${f.name} } : {}),`;
    }
    return `          ${f.name}: input.${f.name},`;
  }),
  ...createAuditLines,
].join("\n");

const updateAuditLines = [
  ...(hasField("updatedBy") ? [`          updatedBy: userId,`] : []),
  ...(hasField("updatedById") ? [`          updatedById: userId,`] : []),
];

const updateDataFields = [
  ...updateFields.map((f) => {
    if (f.isOptional) {
      return `          ...(input.${f.name} !== undefined ? { ${f.name}: input.${f.name} ?? null } : {}),`;
    }
    return `          ...(input.${f.name} != null ? { ${f.name}: input.${f.name} } : {}),`;
  }),
  ...updateAuditLines,
].join("\n");

const serviceContent = `import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import type {
  Create${modelName}Input,
  ${modelName}FilterInput,
  PaginationInput,
  Update${modelName}Input,
  ${modelName}Connection,
  ${modelName}Payload,
} from "../../../generated/graphql/types.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import { validateCreate${modelName}Input, validateUpdate${modelName}Input } from "./helpers/${kebabName}.helper.js";

import { ${modelName}Loader } from "./${kebabName}.loader.js";

@Injectable()
export class ${modelName}Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ${camelName}Loader: ${modelName}Loader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: ${isNumericId ? "number | string" : "string"}, context?: any) {
    extractContextInfo(context);
    const parsedId = ${isNumericId ? `typeof id === "string" ? parseInt(id, 10) : id` : `id`};
    return this.${camelName}Loader.byId.load(${isNumericId ? `Number.isNaN(parsedId) ? (id as any) : parsedId` : `parsedId`});
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ${modelName}FilterInput | null,
    context?: any,
  ): Promise<${modelName}Connection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: ${isNumericId},
      });

      const where = buildPrismaWhere(filter, [${searchFieldNames.map((name) => `"${name}"`).join(", ")}]);

      const [items, totalCount] = await Promise.all([
        this.prisma.${camelName}.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.${camelName}.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ${modelName}Connection;
    } catch (error) {
      return {
        edges: [],
        nodes: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 0,
        userErrors: [createError((error as Error).message)],
      } as unknown as ${modelName}Connection;
    }
  }

  async create(input: Create${modelName}Input, context?: any): Promise<${modelName}Payload> {
    const validationError = validateCreate${modelName}Input(input);
    if (validationError) {
      return {
        ${camelName}: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const ${camelName} = await this.prisma.${camelName}.create({
        data: {
${createDataFields}
        },
      });

      await this.auditService.log({
        userId,
        action: "CREATE_${modelName.toUpperCase()}",
        method: "GRAPHQL_MUTATION",
        tableName: "${modelName}",
        recordId: String(${camelName}.${idField.name}),
        description: "Created ${modelName} record",
        values: ${camelName} as any,
        ipAddress,
        userAgent,
      });

      return {
        ${camelName}: ${camelName} as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        ${camelName}: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: ${isNumericId ? "number | string" : "string"},
    input: Update${modelName}Input,
    context?: any,
  ): Promise<${modelName}Payload> {
    const validationError = validateUpdate${modelName}Input(input);
    if (validationError) {
      return {
        ${camelName}: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = ${isNumericId ? `typeof id === "string" ? parseInt(id, 10) : id` : `id`};
      const ${camelName} = await this.prisma.${camelName}.update({
        where: { id: ${isNumericId ? `Number.isNaN(parsedId) ? (id as any) : parsedId` : `parsedId`} },
        data: {
${updateDataFields}
        },
      });

      this.${camelName}Loader.clear(${isNumericId ? "Number.isNaN(parsedId) ? (id as any) : parsedId" : "id"});

      await this.auditService.log({
        userId,
        action: "UPDATE_${modelName.toUpperCase()}",
        method: "GRAPHQL_MUTATION",
        tableName: "${modelName}",
        recordId: String(parsedId),
        description: "Updated ${modelName} record",
        values: ${camelName} as any,
        ipAddress,
        userAgent,
      });

      return {
        ${camelName}: ${camelName} as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        ${camelName}: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: ${isNumericId ? "number | string" : "string"}, context?: any): Promise<${modelName}Payload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = ${isNumericId ? `typeof id === "string" ? parseInt(id, 10) : id` : `id`};
      const ${camelName} = await this.prisma.${camelName}.delete({
        where: { id: ${isNumericId ? `Number.isNaN(parsedId) ? (id as any) : parsedId` : `parsedId`} },
      });

      this.${camelName}Loader.clear(${isNumericId ? "Number.isNaN(parsedId) ? (id as any) : parsedId" : "id"});

      await this.auditService.log({
        userId,
        action: "DELETE_${modelName.toUpperCase()}",
        method: "GRAPHQL_MUTATION",
        tableName: "${modelName}",
        recordId: String(parsedId),
        description: "Deleted ${modelName} record",
        ipAddress,
        userAgent,
      });

      return {
        ${camelName}: ${camelName} as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        ${camelName}: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: ${isNumericId ? "number | string" : "string"}, context?: any): Promise<${modelName}Payload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = ${isNumericId ? `typeof id === "string" ? parseInt(id, 10) : id` : `id`};
      const ${camelName} = await this.prisma.${camelName}.restore({
        id: ${isNumericId ? `Number.isNaN(parsedId) ? (id as any) : parsedId` : `parsedId`},
      });

      this.${camelName}Loader.clear(${isNumericId ? "Number.isNaN(parsedId) ? (id as any) : parsedId" : "id"});

      await this.auditService.log({
        userId,
        action: "RESTORE_${modelName.toUpperCase()}",
        method: "GRAPHQL_MUTATION",
        tableName: "${modelName}",
        recordId: String(parsedId),
        description: "Restored ${modelName} record",
        ipAddress,
        userAgent,
      });

      return {
        ${camelName}: ${camelName} as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        ${camelName}: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
`;

// Query Resolver
const queryContent = `import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { ${modelName}Service } from "../${kebabName}.service.js";
import type {
  ${modelName}FilterInput,
  PaginationInput,
  ${modelName}Connection,
} from "../../../../generated/graphql/types.js";

@Resolver("${modelName}")
export class ${modelName}QueryResolver {
  constructor(private readonly ${camelName}Service: ${modelName}Service) {}

  @Query("${camelName}ById")
  async ${camelName}ById(@Args("id") id: string, @Context() context: any) {
    return this.${camelName}Service.findOne(id, context);
  }

  @Query("${pluralCamelName}Paginated")
  async ${pluralCamelName}Paginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ${modelName}FilterInput | null,
    @Context() context?: any,
  ): Promise<${modelName}Connection> {
    return this.${camelName}Service.findMany(pagination, filter, context);
  }
}
`;

// Mutation Resolver
const mutationContent = `import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ${modelName}Service } from "../${kebabName}.service.js";
import type {
  Create${modelName}Input,
  Update${modelName}Input,
  ${modelName}Payload,
} from "../../../../generated/graphql/types.js";

@Resolver("${modelName}")
export class ${modelName}MutationResolver {
  constructor(private readonly ${camelName}Service: ${modelName}Service) {}

  @Mutation("create${modelName}")
  async create${modelName}(
    @Args("input") input: Create${modelName}Input,
    @Context() context: any,
  ): Promise<${modelName}Payload> {
    return this.${camelName}Service.create(input, context);
  }

  @Mutation("update${modelName}")
  async update${modelName}(
    @Args("id") id: string,
    @Args("input") input: Update${modelName}Input,
    @Context() context: any,
  ): Promise<${modelName}Payload> {
    return this.${camelName}Service.update(id, input, context);
  }

  @Mutation("delete${modelName}")
  async delete${modelName}(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<${modelName}Payload> {
    return this.${camelName}Service.delete(id, context);
  }

  @Mutation("restore${modelName}")
  async restore${modelName}(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<${modelName}Payload> {
    return this.${camelName}Service.restore(id, context);
  }
}
`;

// Loader
const loaderContent = `import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma/prisma.service.js";
import type { ${modelName} as Prisma${modelName} } from "../../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class ${modelName}Loader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<${isNumericId ? "number" : "string"}, Prisma${modelName} | null>(
    async (ids: readonly (${isNumericId ? "number" : "string"})[]) => {
      const rows = await this.prisma.${camelName}.findMany({
        where: { ${idField.name}: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.${idField.name}, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  clear(id?: ${isNumericId ? "number" : "string"}) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    }
  }
}
`;

// Relation Resolver
const relationContent = `import { Resolver } from "@nestjs/graphql";

@Resolver("${modelName}")
export class ${modelName}RelationResolver {
  /**
   * Field resolver / relation resolver for ${modelName}.
   * Extend this with relations as the schema grows.
   */
}
`;

// Module
const moduleContent = `import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { ${modelName}Service } from "./${kebabName}.service.js";
import { ${modelName}Loader } from "./${kebabName}.loader.js";
import { ${modelName}QueryResolver } from "./resolvers/${kebabName}.query.js";
import { ${modelName}MutationResolver } from "./resolvers/${kebabName}.mutation.js";
import { ${modelName}RelationResolver } from "./resolvers/${kebabName}.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ${modelName}Loader,
    ${modelName}Service,
    ${modelName}QueryResolver,
    ${modelName}MutationResolver,
    ${modelName}RelationResolver,
  ],
  exports: [${modelName}Service, ${modelName}Loader],
})
export class ${modelName}Module {}
`;

// Write module files (preserve existing files if they already exist)
const writeIfNotExists = (filePath, content) => {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, content, "utf-8");
  }
};

writeIfNotExists(resolve(helpersDir, `${kebabName}.helper.ts`), helperContent);
writeIfNotExists(resolve(moduleDir, `${kebabName}.loader.ts`), loaderContent);
writeIfNotExists(resolve(moduleDir, `${kebabName}.service.ts`), serviceContent);
writeIfNotExists(resolve(resolversDir, `${kebabName}.query.ts`), queryContent);
writeIfNotExists(resolve(resolversDir, `${kebabName}.mutation.ts`), mutationContent);
writeIfNotExists(resolve(resolversDir, `${kebabName}.relation.ts`), relationContent);
writeIfNotExists(resolve(moduleDir, `${kebabName}.module.ts`), moduleContent);

console.log(`✨ Created module structure in ${moduleDir} with resolvers/ and helpers/`);

// Update AppModule to import the new module
const appModulePath = resolve(process.cwd(), "src/app.module.ts");
if (existsSync(appModulePath)) {
  let content = readFileSync(appModulePath, "utf-8");
  const moduleName = `${modelName}Module`;
  const relPathToApp = moduleDir.includes("common")
    ? `./modules/common/${kebabName}/${kebabName}.module.js`
    : `./modules/master/${kebabName}/${kebabName}.module.js`;
  const moduleImport = `import { ${moduleName} } from "${relPathToApp}";\n`;

  if (!content.includes(moduleName)) {
    content = moduleImport + content;
    const controllersIndex = content.indexOf("controllers:");
    if (controllersIndex !== -1) {
      const beforeControllers = content.slice(0, controllersIndex);
      const afterControllers = content.slice(controllersIndex);
      const lastBracketIndex = beforeControllers.lastIndexOf("],");
      if (lastBracketIndex !== -1) {
        content =
          beforeControllers.slice(0, lastBracketIndex) +
          `    ${moduleName},\n  ],` +
          beforeControllers.slice(lastBracketIndex + 2) +
          afterControllers;
        writeFileSync(appModulePath, content, "utf-8");
        console.log(`🔌 Registered ${moduleName} in src/app.module.ts`);
      }
    }
  }
}

// Run Prisma generate and Codegen to refresh generated types
if (!args.includes("--no-codegen")) {
  try {
    console.log("🔄 Generating Prisma Client...");
    execSync("npx prisma generate", { stdio: "inherit" });
    console.log("🔄 Running GraphQL Codegen...");
    execSync("npm run codegen", { stdio: "inherit" });
    console.log("✅ Codegen completed successfully.");
  } catch (error) {
    console.error("Codegen encountered an error:", error);
  }
}

