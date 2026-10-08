import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Security Headers via Helmet (configured to allow Apollo Sandbox in dev)
  const isDev = process.env.NODE_ENV !== "production";
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: isDev
        ? false
        : {
            directives: {
              defaultSrc: [`'self'`],
              scriptSrc: [`'self'`],
              styleSrc: [`'self'`, `'unsafe-inline'`],
              imgSrc: [`'self'`, "data:"],
              fontSrc: [`'self'`],
            },
          },
    }),
  );

  // 2. Cookie Parser for sessions & refresh tokens
  app.use(cookieParser());

  // 3. Robust CORS Policy
  app.enableCors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "apollo-require-preflight",
    ],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 API Server running at http://localhost:${port}/graphql`);
}

await bootstrap();
