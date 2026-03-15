const flattenMessages = (value: unknown): string[] => {
  if (!value) return [];

  if (typeof value === "string") {
    const msg = value.trim();
    return msg ? [msg] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenMessages(item));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const directKeys = ["message", "error", "detail", "title"];
    const direct = directKeys.flatMap((key) => flattenMessages(obj[key]));
    if (direct.length) return direct;

    if (obj.errors) {
      const validation = flattenMessages(obj.errors);
      if (validation.length) return validation;
    }

    return Object.values(obj).flatMap((item) => flattenMessages(item));
  }

  return [];
};

export const getApiErrorMessage = async (
  response: Response,
  fallback: string
): Promise<string> => {
  try {
    const text = await response.text();
    if (!text) return fallback;

    let payload: unknown = text;
    try {
      payload = JSON.parse(text);
    } catch {
      // Keep plain text response as-is.
    }

    const messages = flattenMessages(payload);
    if (messages.length) return messages[0];

    const plain = text.trim();
    return plain || fallback;
  } catch {
    return fallback;
  }
};
