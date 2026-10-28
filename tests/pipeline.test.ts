import { describe, it, expect } from "vitest";
import { createPipeline } from "../src";
import type { PipelineBuilder } from "../src/core/builder";
import type {
    PipelineFile,
    PipelineResult,
    Storage,
} from "../src/types/pipeline";
import { ValidationError } from "../src/utils/errors";

const makeFile = (): PipelineFile => ({
    buffer: Buffer.from("ok"),
    filename: "test.png",
    mimeType: "image/png",
    size: 2,
});

/**
 * Deterministic in-memory storage. Pipeline behavior is orthogonal to where
 * bytes land — using a stub keeps these tests fast, cross-platform, and free
 * of filesystem cleanup. Filesystem behavior belongs to localStorage()'s own
 * coverage, not here.
 */
const makeStorage = (): Storage => ({
    async save(file): Promise<PipelineResult> {
        return {
            url: `memory://${file.filename}`,
            path: file.filename,
            size: file.size,
            metadata: {},
            meta: { plugins: [], trace: [] }, // executor replaces `meta`
            originalName: file.filename,
            storedName: file.filename,
            mimeType: file.mimeType,
            provider: "local",
        };
    },
});

describe("pipeline end-to-end", () => {
    it("runs processors in order and merges their metadata into the result", async () => {
        const processorPlugin = (builder: PipelineBuilder) => {
            builder.addProcessor(async (ctx) => {
                ctx.metadata.step1 = true;
                return ctx;
            });
            builder.addProcessor(async (ctx) => {
                ctx.metadata.step2 = true;
                return ctx;
            });
        };

        const pipeline = createPipeline({ storage: makeStorage() })
            .use(processorPlugin);

        const result = await pipeline.process(makeFile());

        expect(result.metadata.step1).toBe(true);
        expect(result.metadata.step2).toBe(true);
    });

    it("merges hooks from multiple plugins in registration order", async () => {
        const order: string[] = [];

        const pluginA = (builder: PipelineBuilder) => {
            builder.mergeHooks({
                onStart: () => { order.push("A"); },
            });
        };

        const pluginB = (builder: PipelineBuilder) => {
            builder.mergeHooks({
                onStart: () => { order.push("B"); },
            });
        };

        const pipeline = createPipeline({ storage: makeStorage() })
            .use(pluginA)
            .use(pluginB);

        await pipeline.process(makeFile());

        // Plugin A registered first → its onStart hook must run first.
        expect(order).toEqual(["A", "B"]);
    });

    it("a throwing validator short-circuits before processors run", async () => {
        let processorRan = false;

        const pipeline = createPipeline({
            storage: makeStorage(),
            validators: [
                () => { throw new ValidationError("rejected by validator"); },
            ],
            processors: [
                async (ctx) => { processorRan = true; return ctx; },
            ],
        });

        await expect(pipeline.process(makeFile())).rejects.toBeInstanceOf(
            ValidationError
        );
        expect(processorRan).toBe(false);
    });
});