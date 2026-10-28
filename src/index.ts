export { createPipeline } from "./core/pipeline";

export { localStorage } from "./storage/local.storage";

export { maxSize } from "./validators/size.validator";
export { allowedMimeTypes } from "./validators/mime.validator";

export { identityProcessor } from "./processors/identity.processor";

export type {
    PipelineFile,
    PipelineResult,
    Processor,
    Validator,
    Storage,
    PipelineContext,
    PipelineProvider,
    PipelineConfig,
    PipelineProviders,
} from "./types/pipeline";

export type {
    PipelineErrorCode,
} from "./utils/errors";

export {
    PipelineError,
    ValidationError,
    ProcessorError,
    StorageError,
    PluginError
} from "./utils/errors";

export { PipelineBuilder } from "./core/builder"

export type { PipelinePlugin } from "./types/plugin"
