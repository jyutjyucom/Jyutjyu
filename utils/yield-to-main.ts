/**
 * Yield to the main thread so long synchronous search loops do not degrade INP.
 */
export async function yieldToMain(): Promise<void> {
  if (
    typeof window !== "undefined" &&
    "scheduler" in window &&
    typeof (
      window as Window & { scheduler?: { yield?: () => Promise<void> } }
    ).scheduler?.yield === "function"
  ) {
    await (
      window as Window & { scheduler: { yield: () => Promise<void> } }
    ).scheduler.yield();
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}
