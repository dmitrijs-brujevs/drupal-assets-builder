export class DrupalAssetsError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {{ cause?: unknown }} [options]
   */
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "DrupalAssetsError";
    this.code = code;
  }
}

export function wrapError(code, message, error) {
  if (error instanceof DrupalAssetsError) {
    return error;
  }
  return new DrupalAssetsError(code, `${message}: ${error.message ?? error}`, {
    cause: error,
  });
}
