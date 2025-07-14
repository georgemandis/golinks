/**
 * Prints an error message to the console with consistent formatting.
 *
 * This utility function safely extracts error messages from unknown error types
 * and formats them with a consistent "✗" prefix for visual clarity.
 *
 * @param message - A descriptive message about what operation failed
 * @param error - The error object or value that was thrown/caught
 *
 * @example
 * ```ts
 * try {
 *   // Some operation that might fail
 *   riskyOperation();
 * } catch (error) {
 *   printError("Failed to complete operation", error);
 * }
 * // Output: ✗ Failed to complete operation: Detailed error message
 * ```
 */
export function printError(message: string, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.log(`✗ ${message}: ${errorMessage}`);
}
