import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Security Headers via Helmet (configured to allow Apollo Sandbox in dev)
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`, "https://apollo-server-landing-page.cdn.apollographql.com"],
          scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`, "https://apollo-server-landing-page.cdn.apollographql.com"],
          styleSrc: [`'self'`, `'unsafe-inline'`, "https://fonts.googleapis.com", "https://apollo-server-landing-page.cdn.apollographql.com"],
          imgSrc: [`'self'`, "data:", "https://apollo-server-landing-page.cdn.apollographql.com"],
          fontSrc: [`'self'`, "https://fonts.gstatic.com"],
          frameSrc: ["https://sandbox.embed.apollographql.com"],
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
