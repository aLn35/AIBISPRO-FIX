import "./config/env";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { validateEnvironment } from "./config/env";

import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

async function bootstrap() {
  validateEnvironment();
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const localDevelopmentOrigin = (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin) return callback(null, true);
    try {
      const hostname = new URL(origin).hostname;
      callback(null, hostname === "localhost" || hostname === "127.0.0.1");
    } catch {
      callback(null, false);
    }
  };

  app.enableCors({
    origin:
      allowedOrigins.length > 0
        ? allowedOrigins
        : process.env.NODE_ENV === "production"
          ? false
          : localDevelopmentOrigin,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle("AIBISPRO API")
    .setDescription("Business Intelligence System API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("api", app, document);

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
  await app.listen(port, host);

  console.log(`Swagger: http://${host}:${port}/api`);
  console.log(`Server running on ${host}:${port}`);
}

bootstrap();
