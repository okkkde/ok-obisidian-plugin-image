import type { LogLevel } from "./types";

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  log: 30,
  info: 40,
  warn: 50,
  error: 60,
  off: 999
};

export class Logger {
  constructor(private getLevel: () => LogLevel) {}

  trace(message: string, ...args: unknown[]): void {
    this.write("trace", message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.write("debug", message, ...args);
  }

  log(message: string, ...args: unknown[]): void {
    this.write("log", message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.write("info", message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.write("warn", message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.write("error", message, ...args);
  }

  private write(level: LogLevel, message: string, ...args: unknown[]): void {
    const configured = this.getLevel();
    if (LEVEL_ORDER[level] < LEVEL_ORDER[configured]) {
      return;
    }
    const prefix = `[Ok Obsidian Plugin Image] ${message}`;
    if (level === "trace") console.trace(prefix, ...args);
    else if (level === "debug") console.debug(prefix, ...args);
    else if (level === "info") console.info(prefix, ...args);
    else if (level === "warn") console.warn(prefix, ...args);
    else if (level === "error") console.error(prefix, ...args);
    else console.log(prefix, ...args);
  }
}
