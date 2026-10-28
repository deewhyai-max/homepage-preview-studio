type Level = "info" | "warn" | "error";

function write(level: Level, msg: string, extra?: Record<string, unknown>) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...extra });
  (level === "error" ? process.stderr : process.stdout).write(line + "\n");
}

export const log = {
  info: (msg: string, extra?: Record<string, unknown>) => write("info", msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => write("warn", msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => write("error", msg, extra),
};

export function errInfo(err: unknown): Record<string, unknown> {
  if (err instanceof Error) return { error: err.message, stack: err.stack?.split("\n").slice(0, 4).join(" | ") };
  return { error: String(err) };
}
