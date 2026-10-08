#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { execSync } from "node:child_process";



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

export function disconnectModels(sourceInput, targetInput) {
  const sourcePascal = toPascalCase(basename(sourceInput, ".prisma"));
  const sourceCamel = toCamelCase(sourcePascal);
  const sourceKebab = toKebabCase(sourcePascal);
  const sourcePlural = pluralize(sourceCamel);

  const targetPascal = toPascalCase(basename(targetInput, ".prisma"));
  const targetCamel = toCamelCase(targetPascal);
  const targetKebab = toKebabCase(targetPascal);
  const targetPlural = pluralize(targetCamel);

  const fkName = `${sourceCamel}Id`;

  console.log(`🔌 Disconnecting ${sourcePascal} <-> ${targetPascal}...`);

  // 1. Remove FK and relation from Target Prisma Schema
  const targetPrismaPath = resolve(process.cwd(), `prisma/schema/${targetPascal}.prisma`);
  if (existsSync(targetPrismaPath)) {
    let content = readFileSync(targetPrismaPath, "utf-8");
    const lines = content.split("\n");
    const filtered = lines.filter((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith(`${fkName} `)) return false;
      if (trimmed.startsWith(`${sourceCamel} `) && trimmed.includes(sourcePascal)) return false;
      if (trimmed.startsWith(`@@index([${fkName}])`)) return false;
      return true;
    });
    writeFileSync(targetPrismaPath, filtered.join("\n"), "utf-8");
    console.log(`📝 Removed ${fkName} & relation from prisma/schema/${targetPascal}.prisma`);
  }

  // 2. Remove relation field from Source Prisma Schema
  const sourcePrismaPath = resolve(process.cwd(), `prisma/schema/${sourcePascal}.prisma`);
  if (existsSync(sourcePrismaPath)) {
    let content = readFileSync(sourcePrismaPath, "utf-8");
    const lines = content.split("\n");
    const filtered = lines.filter((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith(`${targetPlural} `) && trimmed.includes(targetPascal)) return false;
      if (trimmed.startsWith(`${targetCamel} `) && trimmed.includes(targetPascal)) return false;
      return true;
    });
    writeFileSync(sourcePrismaPath, filtered.join("\n"), "utf-8");
    console.log(`📝 Removed relation from prisma/schema/${sourcePascal}.prisma`);
  }

  // Format and generate Prisma client
  try {
    execSync("npx prisma format && npx prisma generate", { stdio: "ignore" });
    console.log("✅ Prisma schema updated & client regenerated.");
  } catch (error) {
    console.warn("Prisma sync warning:", error.message);
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

  // 3. Clean GraphQL Schema Extensions
  const sourceExtendGqlPath = resolve(sourceModuleDir, `${sourceKebab}.typedefs.extend.graphql`);
  if (existsSync(sourceExtendGqlPath)) {
    let content = readFileSync(sourceExtendGqlPath, "utf-8");
    // Remove extend blocks targeting this relation
    content = content.replace(new RegExp(`extend\\s+type\\s+${sourcePascal}\\s*\\{[^}]*(${targetPlural}|${targetCamel})[^}]*\\}\\s*`, "g"), "");
    writeFileSync(sourceExtendGqlPath, content.trim() ? content.trim() + "\n" : "", "utf-8");
    console.log(`📄 Cleaned ${sourceKebab}.typedefs.extend.graphql`);
  }

  const targetExtendGqlPath = resolve(targetModuleDir, `${targetKebab}.typedefs.extend.graphql`);
  if (existsSync(targetExtendGqlPath)) {
    let content = readFileSync(targetExtendGqlPath, "utf-8");
    content = content.replace(new RegExp(`extend\\s+type\\s+${targetPascal}\\s*\\{[^}]*${sourceCamel}[^}]*\\}\\s*`, "g"), "");
    writeFileSync(targetExtendGqlPath, content.trim() ? content.trim() + "\n" : "", "utf-8");
    console.log(`📄 Cleaned ${targetKebab}.typedefs.extend.graphql`);
  }

  // 4. Remove DataLoader in Target Loader
  const targetLoaderPath = resolve(targetModuleDir, `${targetKebab}.loader.ts`);
  if (existsSync(targetLoaderPath)) {
    let content = readFileSync(targetLoaderPath, "utf-8");
    // Remove bySourceId DataLoader definition
    const loaderRegex = new RegExp(`\\s*public\\s+readonly\\s+by${sourcePascal}Id\\s*=[\\s\\S]*?\\);\\n?`, "g");
    content = content.replace(loaderRegex, "");
    content = content.replace(`if (this.by${sourcePascal}Id) this.by${sourcePascal}Id.clearAll();\n`, "");
    content = content.replace(`if (this.by${sourcePascal}Id) this.by${sourcePascal}Id.clearAll();`, "");
    writeFileSync(targetLoaderPath, content, "utf-8");
    console.log(`⚡ Removed by${sourcePascal}Id from ${targetKebab}.loader.ts`);
  }

  // 5. Clean Relation Resolvers
  const cleanResolverFile = (resolverPath, fieldNames, loaderPascal, loaderKebab) => {
    if (!existsSync(resolverPath)) return;
    let content = readFileSync(resolverPath, "utf-8");
    for (const field of fieldNames) {
      const fieldRegex = new RegExp(`\\s*@ResolveField\\(["']${field}["']\\)[\\s\\S]*?async\\s+\\w+\\([^)]*\\)[\\s\\S]*?\\n\\s*\\}`, "g");
      content = content.replace(fieldRegex, "");
    }
    const loaderCamel = toCamelCase(loaderPascal);
    content = content.replace(new RegExp(`import\\s*\\{[\\s\\S]*?\\}\\s*from\\s*["'][^"']*${loaderKebab}\\.loader\\.js["'];?\\n?`, "g"), "");
    content = content.replace(new RegExp(`\\s*private\\s+readonly\\s+${loaderCamel}Loader:\\s*${loaderPascal}Loader,?\\n?`, "g"), "");
    content = content.replace(/constructor\(\s*private readonly prisma: PrismaService,\s*\)/, "constructor(private readonly prisma: PrismaService)");
    content = content.replace(/import\s*\{\s*\}\s*from\s*["'][^"']+["'];?\n?/g, "");
    writeFileSync(resolverPath, content, "utf-8");
    console.log(`🧩 Cleaned relation resolvers in ${basename(resolverPath)}`);
  };

  const sourceResolverPath = resolve(sourceModuleDir, `resolvers/${sourceKebab}.relation.ts`);
  cleanResolverFile(sourceResolverPath, [targetPlural, targetCamel], targetPascal, targetKebab);

  const targetResolverPath = resolve(targetModuleDir, `resolvers/${targetKebab}.relation.ts`);
  cleanResolverFile(targetResolverPath, [sourceCamel], sourcePascal, sourceKebab);

  // 6. Clean Modules Providers
  const cleanModuleFile = (modPath, loaderPascal, loaderKebab) => {
    if (!existsSync(modPath)) return;
    let content = readFileSync(modPath, "utf-8");
    content = content.replace(new RegExp(`import\\s*\\{[\\s\\S]*?\\}\\s*from\\s*["'][^"']*${loaderKebab}\\.loader\\.js["'];?\\n?`, "g"), "");
    content = content.replace(new RegExp(`import\\s*\\{\\s*${loaderPascal}Loader\\s*\\}\\s*from\\s*["'][^"']+["'];?\\n?`, "g"), "");
    content = content.replace(new RegExp(`\\n?\\s*${loaderPascal}Loader,?`, "g"), "");
    content = content.replace(/import\s*\{\s*\}\s*from\s*["'][^"']+["'];?\n?/g, "");
    writeFileSync(modPath, content, "utf-8");
  };

  cleanModuleFile(resolve(sourceModuleDir, `${sourceKebab}.module.ts`), targetPascal, targetKebab);
  cleanModuleFile(resolve(targetModuleDir, `${targetKebab}.module.ts`), sourcePascal, sourceKebab);

  // 7. Refresh Base Schemas & Codegen
  try {
    console.log("🔄 Refreshing GraphQL Base Schemas & Codegen...");
    execSync(`node scripts/init-module.js ${sourcePascal}`, { stdio: "ignore" });
    execSync(`node scripts/init-module.js ${targetPascal}`, { stdio: "ignore" });
    execSync("npm run codegen", { stdio: "inherit" });
    console.log(`🎉 Successfully disconnected ${sourcePascal} and ${targetPascal}!`);
  } catch (error) {
    console.error("Codegen error:", error.message);
  }
}

// Direct CLI invocation
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const args = process.argv.slice(2);
  const positionalArgs = args.filter(
    (arg) =>
      !arg.startsWith("-") &&
      !["graphql", "prisma", "1:1", "1:m", "one-to-one", "one-to-many"].includes(arg.toLowerCase())
  );

  if (positionalArgs.length < 2) {
    console.error("Usage: npx disconnect <SourceModel> <TargetModel>");
    console.error("Example: npx disconnect Section Customer");
    console.error("Example: npx disconnect Area Location");
    process.exit(1);
  }

  const rawSource = positionalArgs[0].trim();
  const rawTarget = positionalArgs[1].trim();
  disconnectModels(rawSource, rawTarget);
}
