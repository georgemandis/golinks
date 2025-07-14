export function printError(message: string, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.log(`✗ ${message}: ${errorMessage}`);
}
