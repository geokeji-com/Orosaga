import type { LoggerService } from "@nestjs/common";

export class JsonLogger implements LoggerService {
  log(message: unknown, context?: string) {
    this.write("info", message, context);
  }
  error(message: unknown, trace?: string, context?: string) {
    this.write("error", message, context, trace);
  }
  warn(message: unknown, context?: string) {
    this.write("warn", message, context);
  }
  debug(message: unknown, context?: string) {
    this.write("debug", message, context);
  }
  verbose(message: unknown, context?: string) {
    this.write("debug", message, context);
  }

  private write(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
  ) {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      context,
      message: message instanceof Error ? message.message : message,
      trace,
    });
    if (level === "error") console.error(entry);
    else console.log(entry);
  }
}
