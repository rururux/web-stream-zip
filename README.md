# Web Stream Zip Library

A versatile library for creating ZIP files using web streams. This library works in Node.js, deno, browser, and edge server environments.

## Installation

```bash
npm install web-stream-zip
```

## Usage

### Edge Server (e.g., Cloudflare Workers)

```javascript
import { ZipStream } from "web-stream-zip"

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const fileGetters = [
    async () => {
      const response = await fetch("https://example.com/path/to/your/file.jpg")
      const blob = await response.blob()

      return {
        name: "file.jpg",
        size: blob.size,
        lastModified: Date.now(),
        stream: () => blob.stream()
      }
    }
  ]

  const zipStream = new ZipStream(fileGetters)

  return new Response(zipStream.readable, {
    headers: { "Content-Type": "application/zip" }
  })
}
```

## API

```typescript
type FileLike = {
  name: string
  size: number
  lastModified: number
  stream(): ReadableStream<Blob>
}

class ZipStream extends TransformStream {
  constructor(fileGetters: Array<(() => Promise<FileLike>)>)
}
```

## License

MIT