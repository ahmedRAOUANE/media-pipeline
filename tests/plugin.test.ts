import { describe, it, expect } from "vitest";
import { PipelineBuilder } from "../src/core/builder";
import type { PipelineContext } from "../src/types/pipeline";

const registerTestValidator = (builder: PipelineBuilder) => {
    builder.addValidator((ctx) => {
        ctx.metadata.test = true;
    });
};

describe("PipelineBuilder plugin registration", () => {
    it("registers a validator added via a plugin function", () => {
        const builder = new PipelineBuilder({ storage: {} as any });

        registerTestValidator(builder);

        expect(builder.validators).toHaveLength(1);
    });

    it("the registered validator executes and mutates the context", async () => {
        const builder = new PipelineBuilder({ storage: {} as any });
        registerTestValidator(builder);

        const ctx: PipelineContext = {
            file: {
                buffer: Buffer.from("ok"),
                filename: "test.txt",
                mimeType: "text/plain",
                size: 2,
            },
            metadata: {},
            meta: { plugins: [], trace: [] },
        };

        for (const v of builder.validators) {
            await v(ctx);
        }

        expect(ctx.metadata.test).toBe(true);
    });
});