/** A failure with a message safe to show the person who requested the video. */
export class JobError extends Error {
  constructor(
    public readonly userMessage: string,
    public readonly retryable = false,
    options?: { cause?: unknown },
  ) {
    super(userMessage, options);
    this.name = "JobError";
  }
}

export class CancelledError extends Error {
  constructor() {
    super("Job was removed or reassigned");
    this.name = "CancelledError";
  }
}

export class ShutdownError extends Error {
  constructor() {
    super("Worker is shutting down");
    this.name = "ShutdownError";
  }
}

/** Map browser / encoder errors to friendly messages. */
export function toJobError(err: unknown): JobError {
  if (err instanceof JobError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const rules: [RegExp, string, boolean][] = [
    [/ERR_NAME_NOT_RESOLVED|ENOTFOUND/i, "We couldn't find that website. Check the address and try again.", false],
    [/ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|ERR_EMPTY_RESPONSE/i, "The website refused the connection.", false],
    [/ERR_CERT|SSL|certificate/i, "The website's security certificate isn't valid.", false],
    [/ERR_TOO_MANY_REDIRECTS/i, "The website keeps redirecting and never loads.", false],
    [/Timeout .*page\.goto|navigation timeout|ERR_TIMED_OUT/i, "The homepage didn't respond within 30 seconds.", false],
    [/Target (page, context or browser )?(has been )?closed|Browser closed|crash/i, "The recording browser crashed. We'll try again.", true],
    [/ffmpeg/i, "Encoding the video failed. We'll try again.", true],
  ];
  for (const [re, text, retryable] of rules) if (re.test(msg)) return new JobError(text, retryable, { cause: err });
  return new JobError("Something went wrong while recording. We'll try again.", true, { cause: err });
}
