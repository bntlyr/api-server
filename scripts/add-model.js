#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: npx add <ModelName> [or npm run add <ModelName>]");
  console.error("Example: npx add Customer.prisma");
  process.exit(1);
}

const rawInput = args[0].trim();
// Strip .prisma extension if provided and extract base name
const base = basename(rawInput, ".prisma");

// Format to PascalCase for the Prisma model name
function toPascalCase(str) {
  return str
    .replace(/[-_ ]+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase());
}

const modelName = toPascalCase(base);
const fileName = `${modelName}.prisma`;
const targetDir = resolve(process.cwd(), "prisma/schema");
const targetPath = resolve(targetDir, fileName);

if (existsSync(targetPath)) {
  console.error(`Error: Model file already exists at ${targetPath}`);
  process.exit(1);
}

const template = `model ${modelName} {
  id        Int       @id @default(autoincrement())
  title     String
  content   String?

  createdAt DateTime  @default(now())
  createdBy String?
  updatedAt DateTime  @updatedAt
  updatedBy String?
  deletedAt DateTime?
  deletedBy String?

  @@index([deletedAt])
}
`;

try {
  writeFileSync(targetPath, template, "utf-8");
  console.log(`✨ Created new model at prisma/schema/${fileName}`);

  // Format schema & generate Prisma Client
  execSync("npx prisma format", { stdio: "inherit" });
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log(`✅ Formatted and generated Prisma Client for prisma/schema/${fileName}`);
} catch (error) {
  console.error("Failed to generate model:", error);
  process.exit(1);
}
