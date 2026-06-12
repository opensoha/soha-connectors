const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN = /(?:secret|token|authorization|password|encryptkey|signature|cookie|apikey|api_key)/i;
const TOKEN_VALUE_PATTERN =
  /\b(?:Bearer\s+)?(?:soha_(?:pat|sat)_[A-Za-z0-9._-]+|[A-Za-z0-9_-]{24,}\.[A-Za-z0-9._-]{12,})\b/g;

export function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(TOKEN_VALUE_PATTERN, REDACTED);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = isSensitiveKey(key) ? REDACTED : redactValue(item);
    }
    return output;
  }
  return value;
}

export function redactRecord(fields: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!fields) {
    return undefined;
  }
  return redactValue(fields) as Record<string, unknown>;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}
