import { PipelineHooks } from "./hooks";
import { PipelineMeta } from "./plugin-meta";

export type PipelineFile = {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    size: number;
};

/**
 * Registry of storage provider names.
 *
 * Consumers writing their own Storage adapter extend this interface via
 * module augmentation:
 *
 *     declare module "media-pipeline" {
 *         interface PipelineProviders {
 *             r2: "r2";
 *         }
 *     }
 *
 * After augmentation, `PipelineProvider` includes the consumer's name, and
 * `"local"` remains available. Non-augmented consumers see exactly `"local"`.
 */
export interface PipelineProviders {
    local: "local";
}

export type PipelineProvider = PipelineProviders[keyof PipelineProviders];

export type PipelineResult = {
    url: string;
    path: string;
    size: number;
    metadata: Record<string, any>;
    meta: PipelineMeta;
    originalName: string;
    storedName: string;
    mimeType: string;
    provider: PipelineProvider;
};

export type Storage = {
    save(file: PipelineFile): Promise<PipelineResult>;
};

export type PipelineContext = {
    file: PipelineFile;
    metadata: Record<string, any>;
    meta: PipelineMeta;
};

export type Validator = (
    ctx: PipelineContext
) => void | Promise<void>;

export type Processor = (
    ctx: PipelineContext
) => PipelineContext | Promise<PipelineContext>;

export type PipelineConfig = {
    validators?: Validator[];
    processors?: Processor[];
    storage: Storage;
    hooks?: PipelineHooks;
};
