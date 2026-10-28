> **Archived as of v1.7.0.** This folder is retained for historical reference.
> Current documentation is the README and the source JSDoc.
> Some content here is stale — most notably, `PipelineResult.provider` is no
> longer the literal `"local"` and is extensible via module augmentation.
> See the README's "Custom Storage Adapters" section for the current model.


# Media Pipeline - Project Overview

**Version:** 1.6.1  
**Runtime:** Node.js  
**Language:** TypeScript  
**Package name:** `media-pipeline`  
**License:** MIT

---

## Purpose

Media Pipeline is a buffer-based file processing library for Node.js. It lets consumers validate a file, run one or more processors, and persist the final output through a storage adapter behind a small chainable API.

---

## Current Capabilities

- Chainable pipeline creation through `createPipeline()`
- Plugin registration through `.use()` with object plugins or setup functions
- Built-in validators: `maxSize()` and `allowedMimeTypes()`
- Built-in processor: `identityProcessor`
- Built-in storage adapter: `localStorage(basePath)`
- Lifecycle hooks: `onStart`, `afterValidate`, `afterProcess`, `onFinish`, `onError`
- Per-run tracing with stage, message, timestamp, and duration metadata
- Typed error classes including `ValidationError`, `ProcessorError`, `StorageError`, and `PluginError`
- Dual package output for `require()` and `import`

---

## Current Constraints

- Files are processed in memory as `Buffer` objects
- Validators and processors run sequentially
- Only the local filesystem adapter is built in today
- `package.json` exposes only a `build` script; the `tests/` folder contains ad hoc scripts rather than an npm-wired suite
- `PipelineResult.provider` is currently typed as `"local"`

---

## Quick Start

```typescript
import {
  createPipeline,
  localStorage,
  maxSize,
  allowedMimeTypes,
} from "media-pipeline";

const pipeline = createPipeline({
  validators: [
    maxSize(5 * 1024 * 1024),
    allowedMimeTypes(["image/jpeg", "image/png"]),
  ],
  storage: localStorage("./uploads"),
});

const result = await pipeline.process({
  buffer: Buffer.from("data"),
  filename: "image.jpg",
  mimeType: "image/jpeg",
  size: 1024,
});
```

---

## Project Structure

```text
src/
|-- core/
|   |-- builder.ts
|   |-- executor.ts
|   |-- pipeline.ts
|   `-- tracer.ts
|-- processors/
|   `-- identity.processor.ts
|-- storage/
|   `-- local.storage.ts
|-- types/
|   |-- hooks.ts
|   |-- pipeline.ts
|   |-- plugin-meta.ts
|   `-- plugin.ts
|-- utils/
|   |-- errors.ts
|   |-- file.ts
|   `-- plugins.ts
|-- validators/
|   |-- mime.validator.ts
|   `-- size.validator.ts
`-- index.ts
```

---

## Package Outputs

- CommonJS entry: `dist/index.js`
- ESM entry: `dist/index.mjs`
- Type declarations: `dist/index.d.ts` and `dist/index.d.mts`
- Root export map:
  - `require("media-pipeline")` -> `dist/index.js`
  - `import "media-pipeline"` -> `dist/index.mjs`

---

## Related Documentation

- [System Architecture](architecture/system-architecture.md)
- [Design Patterns](architecture/design-patterns.md)
- [Data Flow](data-flow/data-flow-overview.md)
- [API Reference](api/endpoints.md)
- [Module Breakdown](modules/module-map.md)
