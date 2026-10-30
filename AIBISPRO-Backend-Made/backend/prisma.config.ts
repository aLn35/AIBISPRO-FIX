import { config } from "dotenv";
import path from "path";
import { defineConfig } from "prisma/config";

config({ path: path.resolve(process.cwd(), "../.env") });
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
