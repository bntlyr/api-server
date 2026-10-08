import { readdirSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import type { CodegenConfig } from "@graphql-codegen/cli";

function getPrismaMappers(): Record<string, string> {
  const schemaDir = resolve(process.cwd(), "prisma/schema");
  const mappers: Record<string, string> = {};
  if (existsSync(schemaDir)) {
    const files = readdirSync(schemaDir).filter(
      (f) => f.endsWith(".prisma") && f !== "schema.prisma",
    );
    for (const file of files) {
      const model = basename(file, ".prisma");
      mappers[model] = `../prisma/client.js#${model} as Prisma${model}`;
    }
  }
  return mappers;
}

const config: CodegenConfig = {
  overwrite: true,
  schema: ["src/**/*.graphql"],
  generates: {
    "src/generated/graphql/types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        scalars: {
          ID: { input: "string", output: "string | number" },
          DateTime: { input: "Date | string", output: "Date | string" },
          JSON: { input: "any", output: "any" },
        },
        mappers: getPrismaMappers(),
        contextType: "../../graphql/context.js#GraphQLContext",
        defaultMapper: "Partial<{T}>",
        enumsAsTypes: true,
      },
    },
  },
};

export default config;
