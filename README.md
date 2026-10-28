# Media Pipeline

A storage-agnostic file processing pipeline for Node.js.

Media Pipeline takes a file buffer through a predictable sequence:

```text
file -> validate -> process -> store -> result
```

It is designed for server-side applications that already have a file in memory and want a clean way to validate, transform, and persist it.

## Features

- Chainable pipeline creation with `createPipeline()`
- Built-in validators for size and MIME type
- Built-in local filesystem storage via `localStorage()`
- Plugin support through `.use()`
- Lifecycle hooks for start, post-validation, post-processing, finish, and error handling
- Per-run tracing through `result.meta.trace`
- Dual package output for CommonJS and ESM
- Zero runtime npm dependencies
- Closed-set provider type, extensible via TypeScript module augmentation

## Installation

```bash
npm install media-pipeline
```

## Quick Start

```ts
import {
  createPipeline,
  localStorage,
  maxSize,
  allowedMimeTypes,
} from "media-pipeline";

const pipeline = createPipeline({
  storage: localStorage("./uploads"),
  validators: [
    maxSize(5 * 1024 * 1024),
    allowedMimeTypes(["image/jpeg", "image/png"]),
  ],
});

const result = await pipeline.process({
  buffer: Buffer.from("data"),
  filename: "image.jpg",
  mimeType: "image/jpeg",
  size: 1024,
});

console.log(result.url);
console.log(result.storedName);
console.log(result.meta.trace);
```

## Core API

### `createPipeline(config)`

Creates a pipeline instance with:

- `use(plugin)`
- `process(file)`

Runtime shape of `config`:

```ts
{
  validators?: Validator[];
  processors?: Processor[];
  storage: Storage;
  hooks?: {
    onStart?: (ctx) => void | Promise<void>;
    afterValidate?: (ctx) => void | Promise<void>;
    afterProcess?: (ctx) => void | Promise<void>;
    onError?: (error, ctx) => void | Promise<void>;
    onFinish?: (result, ctx) => void | Promise<void>;
  };
}
```

### `pipeline.process(file)`

Processes a single file:

```ts
type PipelineFile = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
};
```

Returns:

```ts
type PipelineResult = {
  url: string;
  path: string;
  size: number;
  metadata: Record<string, any>;
  meta: {
    plugins: Array<{ name: string; version?: string; priority?: number }>;
    trace: Array<{
      plugin: string;
      stage: "validator" | "processor" | "hook" | "storage";
      message: string;
      timestamp: number;
      duration?: number;
    }>;
  };
  originalName: string;
  storedName: string;
  mimeType: string;
  provider: PipelineProvider;
};
```

## Built-In Utilities

### Validators

- `maxSize(limit)`
- `allowedMimeTypes(types)`

Example:

```ts
validators: [
  maxSize(10 * 1024 * 1024),
  allowedMimeTypes(["image/jpeg", "image/png"]),
];
```

### Processor

- `identityProcessor`

This is a no-op async processor that returns the incoming context unchanged.

### Storage

- `localStorage(basePath)`

The built-in storage adapter:

- creates the directory if needed
- checks that it is writable
- sanitizes the original filename
- generates a unique stored filename
- writes the file to disk
- returns a `file://` URL

## Hooks

Hooks let you attach side effects to the pipeline lifecycle.

```ts
const pipeline = createPipeline({
  storage: localStorage("./uploads"),
  hooks: {
    onStart(ctx) {
      console.log("Starting:", ctx.file.filename);
    },
    onFinish(result) {
      console.log("Saved:", result.url);
    },
    onError(error) {
      console.error("Pipeline failed:", error.message);
    },
  },
});
```

Hook order during a successful run:

1. `onStart`
2. validators
3. `afterValidate`
4. processors
5. `afterProcess`
6. storage
7. `onFinish`

On failure, `onError` is called and the original error is re-thrown.

## Plugins

Plugins can register validators, processors, hooks, or even replace storage through `PipelineBuilder`.

### Object plugin

```ts
const imagePlugin = {
  name: "image-plugin",
  version: "1.0.0",
  setup(builder) {
    builder.addValidator(allowedMimeTypes(["image/png", "image/jpeg"]));
  },
};

pipeline.use(imagePlugin);
```

### Function plugin

```ts
function auditPlugin(builder) {
  builder.mergeHooks({
    onStart(ctx) {
      console.log("Processing", ctx.file.filename);
    },
  });
}

auditPlugin.displayName = "audit-plugin";

pipeline.use(auditPlugin);
```

Notes:

- object plugins must have a non-empty `name`
- function plugins use `displayName`, then `function.name`, then `"anonymous-plugin"` for tracing
- invalid plugin inputs throw `PluginError`

## Custom Processors

```ts
import type { Processor } from "media-pipeline";

const renameProcessor: Processor = async (ctx) => {
  return {
    ...ctx,
    file: {
      ...ctx.file,
      filename: `processed-${ctx.file.filename}`,
    },
  };
};
```

## Custom Storage Adapters

The library ships only `localStorage()`. Any other backend — S3, Cloudflare R2, Vercel Blob, a database, an in-memory store for tests — is a **consumer-side** adapter. The library provides the `Storage` contract; it does not own the provider.

A custom adapter implements `Storage` and returns a `PipelineResult` from `save()`:

```ts
import type { PipelineFile, PipelineResult, Storage } from "media-pipeline";

export const memoryStorage = (): Storage => ({
  async save(file: PipelineFile): Promise<PipelineResult> {
    return {
      url: `memory://${file.filename}`,
      path: file.filename,
      size: file.size,
      metadata: {},
      meta: { plugins: [], trace: [] }, // executor replaces `meta` with the run trace
      originalName: file.filename,
      storedName: file.filename,
      mimeType: file.mimeType,
      provider: "memory", // ← see "Registering a provider name" below
    };
  },
});
```
It plugs directly into `createPipeline()`:

```ts
const pipeline = createPipeline({
  storage: memoryStorage(),
  validators: [maxSize(5 * 1024 * 1024)],
});
```
### Registering a provider name
`PipelineProvider` is a closed set. By default it is exactly `"local"`. A consumer that writes an adapter for a new backend registers that backend's provider name via TypeScript module augmentation:

```ts
// e.g. `src/env.d.ts` in the consuming project
import "media-pipeline";

declare module "media-pipeline" {
  interface PipelineProviders {
    memory: "memory";
    r2: "r2";
    s3: "s3";
  }
}
```
After augmentation, in that consumer's compilation unit:

- `provider: "memory"` and `provider: "r2"` are valid because the consumer declared them.

- `provider: "gcs"` is still rejected at compile time — typos remain caught.

Consumers that never augment see exactly `"local"`, identical to v1.6.x — no change required.

### Why a closed set instead of `string`
- `provider` is used by consumers for routing and metrics. A typo (`"r22"`, `"S3"`, `"aws_s3"`) that silently compiled would be a data-integrity bug rather than a type error.

- The augmentation block makes "which providers does this app support" a one-line, greppable, compile-time fact — not a scattering of implicit strings.

- It keeps the library storage-agnostic: the library defines the shape of provider identity, but never names a provider itself beyond `"local"`.

## Errors

The package exports these error classes:

- `PipelineError`
- `ValidationError`
- `ProcessorError`
- `StorageError`
- `PluginError`

Example:

```ts
import { ValidationError } from "media-pipeline";

try {
  await pipeline.process(file);
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.details);
  }
}
```

## Current Limitations

- Files are processed in memory as `Buffer` objects
- Validators and processors run sequentially
- Only `localStorage()` ships as a built-in adapter; other backends are consumer-owned
- The repository currently exposes `build`, `test`, `test:watch`, and `typecheck` npm scripts; the `tests/` folder also contains pre-existing exploratory scripts not yet wired into the formal suite

## Development

Build the package with:

```bash
npm run build
```

The repository includes more detailed project docs under [`docs/`](docs/), including architecture, module breakdowns, API notes, and data-flow references.

## License

MIT
