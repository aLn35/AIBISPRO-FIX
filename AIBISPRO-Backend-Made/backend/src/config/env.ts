import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), "../.env") });
config();

export function validateEnvironment(): void {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  if (process.env.NODE_ENV === "production") required.push("CORS_ORIGINS");
  const missing = required.filter((name) => !process.env[name]?.trim());

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if ((process.env.JWT_SECRET ?? "").length < 32) {
    const message = "JWT_SECRET should be at least 32 characters long.";
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.warn(message);
  }

  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
}
