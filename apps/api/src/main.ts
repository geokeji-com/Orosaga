import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { parseServerEnv } from "@orosaga/config";
import { AppModule } from "./app.module.js";
import { HttpErrorFilter } from "./common/http-error.filter.js";
import { JsonLogger } from "./common/json-logger.js";

async function bootstrap() {
  parseServerEnv();
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(),
  });
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.PUBLIC_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
  await app.listen(
    Number(process.env.PORT ?? 3000),
    process.env.HOST ?? "0.0.0.0",
  );
}

void bootstrap();
