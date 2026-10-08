#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync, rmSync } from "node:fs";
import { resolve, basename } from "node:path";
import { execSync } from "node:child_process";
import { disconnectModels } from "./disconnect.js";

const args = process.argv.slice(2);

const positionalArgs = args.filter((arg) => !arg.startsWith("-"));

if (positionalArgs.length === 0) {
  console.error("Usage: npx delete-model <ModelName> [or npm run delete:model <ModelName>]");
  console.error("Example: npx delete-model Location");
  process.exit(1);
}

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

const rawInput = positionalArgs[0].trim();
const modelPascal = toPascalCase(basename(rawInput, ".prisma"));
const modelCamel = toCamelCase(modelPascal);
const modelKebab = toKebabCase(modelPascal);

console.log(`🗑️  Deleting Model: ${modelPascal}...`);

// 1. Scan and disconnect all relations connected to this model
const schemaDir = resolve(process.cwd(), "prisma/schema");
if (existsSync(schemaDir)) {
  const prismaFiles = readdirSync(schemaDir).filter(
    (f) => f.endsWith(".prisma") && f !== "schema.prisma" && f !== `${modelPascal}.prisma`
  );

  for (const file of prismaFiles) {
    const otherModel = basename(file, ".prisma");
    const otherContent = readFileSync(resolve(schemaDir, file), "utf-8");

    // Check if other model references this model (as target or source)
    if (
      otherContent.includes(`${modelCamel}Id`) ||
      otherContent.includes(`${modelCamel} `) ||
      otherContent.includes(`${modelPascal}`)
    ) {
      console.log(`🔗 Disconnecting from ${otherModel}...`);
      try {
        disconnectModels(otherModel, modelPascal);
        disconnectModels(modelPascal, otherModel);
      } catch (err) {
        console.warn(`Warning disconnecting ${otherModel}:`, err.message);
      }
    }
  }
}

// 2. Remove Prisma schema file
const prismaFilePath = resolve(process.cwd(), `prisma/schema/${modelPascal}.prisma`);
if (existsSync(prismaFilePath)) {
  unlinkSync(prismaFilePath);
  console.log(`📝 Removed prisma/schema/${modelPascal}.prisma`);
}

// 3. Remove generated GraphQL base schema
const baseSchemaPath1 = resolve(process.cwd(), `src/generated/graphql/schemas/${modelKebab}.graphql`);
const baseSchemaPath2 = resolve(process.cwd(), `src/generated/graphql/schemas/${modelPascal}.graphql`);
if (existsSync(baseSchemaPath1)) {
  unlinkSync(baseSchemaPath1);
  console.log(`📄 Removed src/generated/graphql/schemas/${modelKebab}.graphql`);
}
if (existsSync(baseSchemaPath2)) {
  unlinkSync(baseSchemaPath2);
  console.log(`📄 Removed src/generated/graphql/schemas/${modelPascal}.graphql`);
}

// 4. Remove module directory in src/modules/<modelKebab>/
const moduleDir = resolve(process.cwd(), `src/modules/${modelKebab}`);
if (existsSync(moduleDir)) {
  rmSync(moduleDir, { recursive: true, force: true });
  console.log(`📂 Deleted module directory src/modules/${modelKebab}/`);
}

// 5. Remove module registration from src/app.module.ts
const appModulePath = resolve(process.cwd(), "src/app.module.ts");
if (existsSync(appModulePath)) {
  let appModuleContent = readFileSync(appModulePath, "utf-8");
  const moduleName = `${modelPascal}Module`;

  // Remove import statement
  appModuleContent = appModuleContent.replace(
    new RegExp(`import\\s*\\{\\s*${moduleName}\\s*\\}\\s*from\\s*["'][^"']+["'];?\\n?`, "g"),
    ""
  );

  // Remove from imports array
  appModuleContent = appModuleContent.replace(new RegExp(`\\s*${moduleName},?\\n?`, "g"), "\n");

  writeFileSync(appModulePath, appModuleContent, "utf-8");
  console.log(`🔌 Unregistered ${moduleName} from src/app.module.ts`);
}

// 6. Regenerate Prisma and GraphQL Codegen
try {
  console.log("🔄 Updating Prisma Client & GraphQL Types...");
  execSync("npx prisma format && npx prisma generate", { stdio: "ignore" });
  execSync("npm run codegen", { stdio: "inherit" });
  console.log(`🎉 Model ${modelPascal} has been completely removed!`);
} catch (error) {
  console.error("Sync error:", error.message);
}
