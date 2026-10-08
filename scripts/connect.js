#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);

const isGraphqlOnly =
  args.some((arg) => /^-*graphql$/i.test(arg) || arg === "--mode=graphql") ||
  process.env.npm_config_graphql !== undefined ||
  process.env.npm_config_mode === "graphql";

const isPrismaExplicit =
  args.some((arg) => /^-*prisma$/i.test(arg) || arg === "--mode=prisma") ||
  process.env.npm_config_prisma !== undefined ||
  process.env.npm_config_mode === "prisma";

const isPrismaMode = !isGraphqlOnly || (isPrismaExplicit && !isGraphqlOnly);

const isOneToOne =
  args.some((arg) => arg === "--type=1:1" || arg === "--one-to-one" || arg === "--1:1" || arg === "1:1") ||
  process.env.npm_config_type === "1:1" ||
  process.env.npm_config_type === "one-to-one" ||
  process.env.npm_config_one_to_one !== undefined;

const positionalArgs = args.filter(
  (arg) =>
    !arg.startsWith("-") &&
    !["graphql", "prisma", "1:1", "1:m", "one-to-one", "one-to-many"].includes(arg.toLowerCase())
);

if (positionalArgs.length < 2) {
  console.error("Usage: npx connect <SourceModel> <TargetModel> [--prisma | --graphql] [--type=1:m | 1:1]");
  console.error("Example: npx connect Area Location --prisma");
  console.error("Example: npx connect User Profile --prisma --type=1:1");
  console.error("Example: npx connect Section Customer --graphql");
  process.exit(1);
}

const rawSource = positionalArgs[0].trim();
const rawTarget = positionalArgs[1].trim();

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

const sourcePascal = toPascalCase(basename(rawSource, ".prisma"));
const sourceCamel = toCamelCase(sourcePascal);
const sourceKebab = toKebabCase(sourcePascal);
const sourcePlural = pluralize(sourceCamel);

const targetPascal = toPascalCase(basename(rawTarget, ".prisma"));
const targetCamel = toCamelCase(targetPascal);
const targetKebab = toKebabCase(targetPascal);
const targetPlural = pluralize(targetCamel);

const fkName = `${sourceCamel}Id`;

// 1. Verify Prisma models exist
const sourcePrismaPath = resolve(process.cwd(), `prisma/schema/${sourcePascal}.prisma`);
const targetPrismaPath = resolve(process.cwd(), `prisma/schema/${targetPascal}.prisma`);

if (!existsSync(sourcePrismaPath)) {
  console.error(`Error: Source model file not found at ${sourcePrismaPath}`);
  process.exit(1);
}

if (!existsSync(targetPrismaPath)) {
  console.error(`Error: Target model file not found at ${targetPrismaPath}`);
  process.exit(1);
}

// 2. Read source ID type
const sourceContent = readFileSync(sourcePrismaPath, "utf-8");
const sourceIdMatch = sourceContent.match(/(\w+)\s+(Int|String|BigInt)\s+@id/);
const sourceIdField = sourceIdMatch ? sourceIdMatch[1] : "id";
const sourceIdType = sourceIdMatch ? sourceIdMatch[2] : "Int";

console.log(`🔗 Connecting ${sourcePascal} -> ${targetPascal} (${isOneToOne ? "1:1" : "1:N"}) using ${isPrismaMode ? "Prisma Database Relation" : "GraphQL-Only Loose Relation"}...`);

// 3. Update Target Prisma Model (add FK field and optional @relation)
let targetContent = readFileSync(targetPrismaPath, "utf-8");
if (!targetContent.includes(`${fkName} `)) {
  let targetFieldsToAdd = "";
  if (isPrismaMode) {
    if (isOneToOne) {
      targetFieldsToAdd = `  ${fkName} ${sourceIdType}? @unique\n  ${sourceCamel} ${sourcePascal}? @relation(fields: [${fkName}], references: [${sourceIdField}])\n`;
    } else {
      targetFieldsToAdd = `  ${fkName} ${sourceIdType}?\n  ${sourceCamel} ${sourcePascal}? @relation(fields: [${fkName}], references: [${sourceIdField}])\n`;
    }
  } else {
    targetFieldsToAdd = `  ${fkName} ${sourceIdType}?\n`;
  }

  const indexMatch = targetContent.lastIndexOf("@@");
  if (indexMatch !== -1) {
    targetContent =
      targetContent.slice(0, indexMatch) +
      targetFieldsToAdd +
      `  @@index([${fkName}])\n  ` +
      targetContent.slice(indexMatch);
  } else {
    const lastBrace = targetContent.lastIndexOf("}");
    targetContent =
      targetContent.slice(0, lastBrace) +
      targetFieldsToAdd +
      `  @@index([${fkName}])\n` +
      targetContent.slice(lastBrace);
  }
  writeFileSync(targetPrismaPath, targetContent, "utf-8");
  console.log(`📝 Updated prisma/schema/${targetPascal}.prisma with ${fkName}`);
}

// 4. Update Source Prisma Model (only in --prisma mode)
if (isPrismaMode) {
  let updatedSourceContent = readFileSync(sourcePrismaPath, "utf-8");
  const relationFieldName = isOneToOne ? targetCamel : targetPlural;
  const relationFieldType = isOneToOne ? `${targetPascal}?` : `${targetPascal}[]`;

  if (!updatedSourceContent.includes(`${relationFieldName} `)) {
    const sourceFieldToAdd = `  ${relationFieldName} ${relationFieldType}\n`;
    const indexMatch = updatedSourceContent.lastIndexOf("@@");
    if (indexMatch !== -1) {
      updatedSourceContent =
        updatedSourceContent.slice(0, indexMatch) +
        sourceFieldToAdd +
        "  " +
        updatedSourceContent.slice(indexMatch);
    } else {
      const lastBrace = updatedSourceContent.lastIndexOf("}");
      updatedSourceContent =
        updatedSourceContent.slice(0, lastBrace) +
        sourceFieldToAdd +
        updatedSourceContent.slice(lastBrace);
    }
    writeFileSync(sourcePrismaPath, updatedSourceContent, "utf-8");
    console.log(`📝 Updated prisma/schema/${sourcePascal}.prisma with ${relationFieldName}`);
  }
}

// Format and Regenerate Prisma Client
try {
  execSync("npx prisma format && npx prisma generate", { stdio: "inherit" });
  console.log("✅ Prisma schema formatted & client regenerated.");
} catch (error) {
  console.error("Prisma error:", error);
}

function findModuleDir(kebab) {
  const base = resolve(process.cwd(), "src/modules");
  if (existsSync(resolve(base, "master", kebab))) return resolve(base, "master", kebab);
  if (existsSync(resolve(base, "common", kebab))) return resolve(base, "common", kebab);
  if (existsSync(resolve(base, "inventory", kebab))) return resolve(base, "inventory", kebab);
  if (existsSync(resolve(base, kebab))) return resolve(base, kebab);
  return resolve(base, "master", kebab);
}

const sourceModuleDir = findModuleDir(sourceKebab);
const targetModuleDir = findModuleDir(targetKebab);

// 5. Update GraphQL Schema Extensions
const sourceExtendGqlPath = resolve(sourceModuleDir, `${sourceKebab}.typedefs.extend.graphql`);
const targetExtendGqlPath = resolve(targetModuleDir, `${targetKebab}.typedefs.extend.graphql`);

const sourceRelationFieldGql = isOneToOne ? `${targetCamel}: ${targetPascal}` : `${targetPlural}: [${targetPascal}!]!`;
const sourceExtendSnippet = `extend type ${sourcePascal} {\n  ${sourceRelationFieldGql}\n}\n`;
const targetExtendSnippet = `extend type ${targetPascal} {\n  ${sourceCamel}: ${sourcePascal}\n}\n`;

if (existsSync(sourceModuleDir)) {
  let sourceExtendContent = existsSync(sourceExtendGqlPath) ? readFileSync(sourceExtendGqlPath, "utf-8") : "";
  if (!sourceExtendContent.includes(`${sourceRelationFieldGql}`)) {
    sourceExtendContent = sourceExtendContent + "\n" + sourceExtendSnippet;
    writeFileSync(sourceExtendGqlPath, sourceExtendContent.trim() + "\n", "utf-8");
    console.log(`📄 Updated ${sourceKebab}.typedefs.extend.graphql`);
  }
}

if (existsSync(targetModuleDir)) {
  let targetExtendContent = existsSync(targetExtendGqlPath) ? readFileSync(targetExtendGqlPath, "utf-8") : "";
  if (!targetExtendContent.includes(`${sourceCamel}: ${sourcePascal}`)) {
    targetExtendContent = targetExtendContent + "\n" + targetExtendSnippet;
    writeFileSync(targetExtendGqlPath, targetExtendContent.trim() + "\n", "utf-8");
    console.log(`📄 Updated ${targetKebab}.typedefs.extend.graphql`);
  }
}

// 6. Update Target DataLoader with Batch Loader
const targetLoaderPath = resolve(targetModuleDir, `${targetKebab}.loader.ts`);
if (existsSync(targetLoaderPath)) {
  let loaderContent = readFileSync(targetLoaderPath, "utf-8");
  if (!loaderContent.includes(`by${sourcePascal}Id`)) {
    const batchLoaderSnippet = isOneToOne
      ? `  public readonly by${sourcePascal}Id = new DataLoader<${sourceIdType === "Int" ? "number" : "string"}, Prisma${targetPascal} | null>(
    async (${sourceCamel}Ids: readonly (${sourceIdType === "Int" ? "number" : "string"})[]) => {
      const rows = await this.prisma.${targetCamel}.findMany({
        where: { ${fkName}: { in: [...${sourceCamel}Ids] } },
      });
      const map = new Map(rows.map((row) => [row.${fkName}, row]));
      return ${sourceCamel}Ids.map((id) => (id != null ? map.get(id) ?? null : null));
    },
  );\n`
      : `  public readonly by${sourcePascal}Id = new DataLoader<${sourceIdType === "Int" ? "number" : "string"}, Prisma${targetPascal}[]>(
    async (${sourceCamel}Ids: readonly (${sourceIdType === "Int" ? "number" : "string"})[]) => {
      const rows = await this.prisma.${targetCamel}.findMany({
        where: { ${fkName}: { in: [...${sourceCamel}Ids] } },
      });
      const groupMap = new Map<${sourceIdType === "Int" ? "number" : "string"}, Prisma${targetPascal}[]>();
      for (const row of rows) {
        if (row.${fkName} != null) {
          const list = groupMap.get(row.${fkName}) ?? [];
          list.push(row);
          groupMap.set(row.${fkName}, list);
        }
      }
      return ${sourceCamel}Ids.map((id) => groupMap.get(id) ?? []);
    },
  );\n`;

    const clearIndex = loaderContent.indexOf("clear(");
    if (clearIndex !== -1) {
      loaderContent = loaderContent.slice(0, clearIndex) + batchLoaderSnippet + "\n  " + loaderContent.slice(clearIndex);
    } else {
      const lastBrace = loaderContent.lastIndexOf("}");
      loaderContent = loaderContent.slice(0, lastBrace) + "\n" + batchLoaderSnippet + "\n}\n";
    }

    // Also clear bySourceId on mutations
    loaderContent = loaderContent.replace(
      "this.byId.clearAll();",
      `this.byId.clearAll();\n    if (this.by${sourcePascal}Id) this.by${sourcePascal}Id.clearAll();`
    );

    writeFileSync(targetLoaderPath, loaderContent, "utf-8");
    console.log(`⚡ Added DataLoader batch loader by${sourcePascal}Id in ${targetKebab}.loader.ts`);
  }
}

// 7. Update Modules to provide cross-module Loaders
function registerLoaderInModule(modulePath, loaderName, loaderRelativePath) {
  if (!existsSync(modulePath)) return;
  let content = readFileSync(modulePath, "utf-8");
  if (!content.includes(loaderName)) {
    const importStmt = `import { ${loaderName} } from "${loaderRelativePath}";\n`;
    content = importStmt + content;
    const providersIndex = content.indexOf("providers: [");
    if (providersIndex !== -1) {
      content = content.replace("providers: [", `providers: [\n    ${loaderName},`);
      writeFileSync(modulePath, content, "utf-8");
      console.log(`🔌 Registered ${loaderName} in ${basename(modulePath)}`);
    }
  }
}

const sourceModulePath = resolve(sourceModuleDir, `${sourceKebab}.module.ts`);
const targetModulePath = resolve(targetModuleDir, `${targetKebab}.module.ts`);

const relLoaderPathForSource = path.relative(sourceModuleDir, resolve(targetModuleDir, `${targetKebab}.loader.js`)).replace(/\\/g, "/");
const relLoaderPathForTarget = path.relative(targetModuleDir, resolve(sourceModuleDir, `${sourceKebab}.loader.js`)).replace(/\\/g, "/");

registerLoaderInModule(sourceModulePath, `${targetPascal}Loader`, relLoaderPathForSource.startsWith(".") ? relLoaderPathForSource : `./${relLoaderPathForSource}`);
registerLoaderInModule(targetModulePath, `${sourcePascal}Loader`, relLoaderPathForTarget.startsWith(".") ? relLoaderPathForTarget : `./${relLoaderPathForTarget}`);

// 8. Update Relation Resolvers in both modules using DataLoaders
function updateRelationResolver(resolverPath, entityPascal, loaderPascal, resolveFieldCode) {
  if (!existsSync(resolverPath)) return;

  let content = readFileSync(resolverPath, "utf-8");
  const loaderCamel = toCamelCase(loaderPascal);

  // Ensure imports
  if (!content.includes("@Parent") || !content.includes("@ResolveField")) {
    content = `import { Parent, ResolveField, Resolver } from "@nestjs/graphql";\n` + content.replace(/import\s*\{[^}]*\}\s*from\s*["']@nestjs\/graphql["'];?\n?/, "");
  }
  if (!content.includes("PrismaService")) {
    content = `import { PrismaService } from "../../../prisma/prisma.service.js";\n` + content;
  }
  const prismaTypeImport = `import type { ${entityPascal} as Prisma${entityPascal} } from "../../../generated/prisma/client.js";`;
  if (!content.includes(`Prisma${entityPascal}`)) {
    content = `${prismaTypeImport}\n` + content;
  }

  // Import loader
  const loaderImport = `import { ${loaderPascal}Loader } from "../../${toKebabCase(loaderPascal)}/${toKebabCase(loaderPascal)}.loader.js";`;
  if (!content.includes(`${loaderPascal}Loader`)) {
    content = `${loaderImport}\n` + content;
  }

  // Update constructor
  if (!content.includes("constructor(")) {
    content = content.replace(
      new RegExp(`export class ${entityPascal}RelationResolver {`),
      `export class ${entityPascal}RelationResolver {\n  constructor(\n    private readonly prisma: PrismaService,\n    private readonly ${loaderCamel}Loader: ${loaderPascal}Loader,\n  ) {}`
    );
  } else if (!content.includes(`${loaderCamel}Loader`)) {
    content = content.replace(
      /constructor\s*\(([\s\S]*?)\)\s*\{/,
      (_, params) => {
        const trimmed = params.trim();
        const trailingComma = trimmed && !trimmed.endsWith(",") ? "," : "";
        return `constructor(\n    ${trimmed}${trailingComma}\n    private readonly ${loaderCamel}Loader: ${loaderPascal}Loader,\n  ) {`;
      }
    );
  }

  // Add resolveField if not already present
  const fieldNameMatch = resolveFieldCode.match(/@ResolveField\(["']([^"']+)["']\)/);
  if (fieldNameMatch) {
    const fieldName = fieldNameMatch[1];
    if (content.includes(`@ResolveField("${fieldName}")`)) {
      // Replace existing resolveField with DataLoader version
      const regex = new RegExp(`@ResolveField\\("${fieldName}"\\)[\\s\\S]*?async ${fieldName}\\([^)]*\\)[\\s\\S]*?\\n  \\}`, "g");
      content = content.replace(regex, resolveFieldCode);
    } else {
      const lastBrace = content.lastIndexOf("}");
      content = content.slice(0, lastBrace) + "\n" + resolveFieldCode + "\n}\n";
    }
    writeFileSync(resolverPath, content, "utf-8");
    console.log(`🧩 Added DataLoader @ResolveField("${fieldName}") to ${basename(resolverPath)}`);
  }
}

// Source Relation Resolver (e.g. Area -> locations via locationLoader)
const sourceResolverPath = resolve(process.cwd(), `src/modules/${sourceKebab}/resolvers/${sourceKebab}.relation.ts`);
const sourceResolveCode = isOneToOne
  ? `  @ResolveField("${targetCamel}")\n  async ${targetCamel}(@Parent() ${sourceCamel}: Prisma${sourcePascal}) {\n    return this.${targetCamel}Loader.by${sourcePascal}Id.load(${sourceCamel}.${sourceIdField});\n  }`
  : `  @ResolveField("${targetPlural}")\n  async ${targetPlural}(@Parent() ${sourceCamel}: Prisma${sourcePascal}) {\n    return this.${targetCamel}Loader.by${sourcePascal}Id.load(${sourceCamel}.${sourceIdField});\n  }`;

updateRelationResolver(sourceResolverPath, sourcePascal, targetPascal, sourceResolveCode);

// Target Relation Resolver (e.g. Location -> area via areaLoader)
const targetResolverPath = resolve(process.cwd(), `src/modules/${targetKebab}/resolvers/${targetKebab}.relation.ts`);
const targetResolveCode = `  @ResolveField("${sourceCamel}")\n  async ${sourceCamel}(@Parent() ${targetCamel}: Prisma${targetPascal}) {\n    if (!${targetCamel}.${fkName}) return null;\n    return this.${sourceCamel}Loader.byId.load(${targetCamel}.${fkName});\n  }`;

updateRelationResolver(targetResolverPath, targetPascal, sourcePascal, targetResolveCode);

// 9. Refresh Base Schemas and GraphQL Codegen
try {
  console.log("🔄 Refreshing GraphQL Base Schemas & Codegen...");
  execSync(`node scripts/init-module.js ${sourcePascal}`, { stdio: "ignore" });
  execSync(`node scripts/init-module.js ${targetPascal}`, { stdio: "ignore" });
  execSync("npm run codegen", { stdio: "inherit" });
  console.log(`🎉 Connection between ${sourcePascal} and ${targetPascal} with DataLoaders completed successfully!`);
} catch (error) {
  console.error("Codegen error:", error);
}
