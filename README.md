# Web Stream Zip Library

A versatile library for creating ZIP files using web streams. This library works in Node.js, deno, browser, and edge server environments.

## Installation

```bash
npm install web-stream-zip
```

## Usage

```javascript
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