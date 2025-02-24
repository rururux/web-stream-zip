# Web Stream Zip Library

A lightweight ZIP file creation library using Web Streams API. Works universally across modern JavaScript runtimes:

- Node.js (v18+)
- Deno
- Modern Browsers
- Edge Runtimes (Cloudflare Workers, Vercel Edge Functions, etc.)

## Key Features

- 🌐 Universal - Works in any environment supporting Web Streams API
- 🪽 Lightweight - Zero dependencies, pure Web Streams implementation
- 🚰 Streaming - Process large files without loading them into memory
- 📦 Standards-based - Uses standard Web APIs only

## Usage

```typescript
import { ZipStream, ZipEntryStream, getZipContentType, getZipContentDisposition } from "web-stream-zip"

const files: File[] = await fetchFiles()
const zipStream = new ZipStream()

(async () => {
  for (const file of files) {
    await file
      .stream()
      .pipeThrough(
        new ZipEntryStream({ fileName: file.name, lastModified: file.lastModified })
      )
      .pipeTo(zipStream.writable, { preventClose: true })
  }

  await zipStream.writable.close()
})()

return new Response(zipStream.readable, {
  headers: {
    "Content-Type": getZipContentType() // "application/zip"
    "Content-Disposition": getZipContentDisposition("sample.zip") // `attachment: filename="${fileName}"`
  }
})

```

## API

```typescript
class ZipStream extends TransformStream {
  constructor()
}

class ZipEntryStream extends TransformStream {
  constructor(entryMetadata: { fileName: string, lastModified: number })
}

// utils
function getZipContentType(): "application/zip"
function getZipContentDisposition<FileName extends string>(fileName: FileName): `attachment: filename="${FileName}"`
```

## License

MIT