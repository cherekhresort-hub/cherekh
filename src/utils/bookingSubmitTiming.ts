const SUBMIT_MIN_MS = 2000
const SUBMIT_STEP_MIN_MS = 700

/** Let React commit and the browser paint before continuing async submit work. */
export const yieldToPaint = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

export const waitMinSubmitDuration = async (
  startedAt: number,
  minMs = SUBMIT_MIN_MS
): Promise<void> => {
  const elapsed = Date.now() - startedAt
  if (elapsed < minMs) {
    await new Promise((resolve) => setTimeout(resolve, minMs - elapsed))
  }
}

export const waitMinStepDuration = async (
  stepStartedAt: number,
  minMs = SUBMIT_STEP_MIN_MS
): Promise<void> => {
  await waitMinSubmitDuration(stepStartedAt, minMs)
}
