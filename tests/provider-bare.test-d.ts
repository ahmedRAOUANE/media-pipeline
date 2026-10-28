// Type-only file — checked exclusively by `tsc --noEmit -p tsconfig.bare.json`.
// Excluded from the default tsconfig program so that
// `tests/provider-augmentation.test.ts` cannot leak its augmentation here.

import type { PipelineProvider } from "media-pipeline";

const ok: PipelineProvider = "local";

// The directive must sit on the line immediately before the erroring line.
// If it becomes unused, the closed-type guarantee is broken.
// @ts-expect-error — 'r2' is not a known provider without augmentation.
const notOk: PipelineProvider = "r2";

export { ok, notOk };