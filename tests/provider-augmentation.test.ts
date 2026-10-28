import { describe, it, expect } from "vitest";
import type {
    PipelineProvider,
    PipelineResult,
    PipelineFile,
    Storage,
} from "media-pipeline";
import { createPipeline } from "media-pipeline";

// ---------------------------------------------------------------
// Module augmentation from the ROOT specifier — exactly what a
// downstream consumer would write in their own .d.ts or .ts file.
// If this block fails to merge, the type assertions below will
// fail to compile and Step 1 must be revisited.
// ---------------------------------------------------------------
declare module "media-pipeline" {
    interface PipelineProviders {
        r2: "r2";
    }
}

describe("PipelineProvider augmentation", () => {
    it("accepts 'local' (baseline still works)", () => {
        const p: PipelineProvider = "local";
        expect(p).toBe("local");
    });

    it("accepts 'r2' after augmentation", () => {
        const p: PipelineProvider = "r2";
        expect(p).toBe("r2");
    });

    it("propagates the augmented provider into PipelineResult", () => {
        const r: PipelineResult = {
            url: "r2://bucket/key",
            path: "key",
            size: 1,
            metadata: {},
            meta: { plugins: [], trace: [] },
            originalName: "x.zip",
            storedName: "key",
            mimeType: "application/zip",
            provider: "r2",
        };
        expect(r.provider).toBe("r2");
    });

    it("works end-to-end with a custom Storage returning provider 'r2'", async () => {
        const r2Storage: Storage = {
            async save(file: PipelineFile): Promise<PipelineResult> {
                return {
                    url: `r2://test-bucket/${file.filename}`,
                    path: file.filename,
                    size: file.size,
                    metadata: {},
                    meta: { plugins: [], trace: [] },
                    originalName: file.filename,
                    storedName: file.filename,
                    mimeType: file.mimeType,
                    provider: "r2", // ← type-checks only because of the augmentation above
                };
            },
        };

        const pipeline = createPipeline({ storage: r2Storage });
        const result = await pipeline.process({
            buffer: Buffer.from("ok"),
            filename: "artifact.zip",
            mimeType: "application/zip",
            size: 2,
        });

        expect(result.provider).toBe("r2");
        expect(result.path).toBe("artifact.zip");
    });
});