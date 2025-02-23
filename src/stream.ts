import { CRC32Calculator } from "./crc32.ts"
import { indexOfLocalFileHeader, parseLocalFileHeader } from "./parser.ts"
import { createCentralDirectoryHeader, createDataDescriptor, createEndOfCentralDirectory, createLocalFileHeader } from "./record.ts"
import type { CentralDirectoryHeaderData } from "./types.ts"

const internalMap = new Map<string, Omit<CentralDirectoryHeaderData, "offset">>()

type ZipEntryData = {
  fileName: string
  lastModified: number
}

// 何故か node v23.8.0 では deflate-raw の時だけ
// CompressionStream の reader.read() の promise が永遠に resolve しないバグ？がある
// 一応 pipeThrough や別の WritableStream を経由する方法は使える
export class ZipEntryStream extends TransformStream<Uint8Array> {
  constructor ({
    fileName,
    lastModified,
  }: ZipEntryData) {
    const zipEntryId = globalThis.crypto.randomUUID()
    const calculator = new CRC32Calculator()
    const compressionStream = new CompressionStream("deflate-raw")
    let writableStream: WritableStream<Uint8Array>
    let uncompressedSize = 0
    let compressedSize = 0
    let pipeToPromise: Promise<void>

    super({
      start(controller) {
        const localFileHeader = createLocalFileHeader({ fileName, lastModified, extraField: zipEntryId })

        writableStream = new WritableStream({
          write(chunk) {
            compressedSize += chunk.byteLength

            controller.enqueue(chunk)
          }
        })

        pipeToPromise = compressionStream.readable.pipeTo(writableStream)
        controller.enqueue(localFileHeader)
      },

      async transform(chunk, _controller) {
        uncompressedSize += chunk.byteLength
        calculator.add(new Uint8Array(chunk))

        const compressionStreamWriter = compressionStream.writable.getWriter()

        await compressionStreamWriter.ready
        await compressionStreamWriter.write(chunk)

        compressionStreamWriter.releaseLock()
      },

      async flush(controller) {
        const crc32 = calculator.finish()

        await compressionStream.writable.close()
        // pipeToPromise が resolve した時点で writableStream は自動で close 済み
        await pipeToPromise

        const dataDescriptor = createDataDescriptor({ crc32, compressedSize, uncompressedSize })

        internalMap.set(zipEntryId, {
          lastModified,
          crc32,
          compressedSize,
          uncompressedSize,
          fileName,
          extraField: zipEntryId
        })

        controller.enqueue(dataDescriptor)
      }
    })
  }
}

export class ZipStream extends TransformStream<Uint8Array> {
  constructor() {
    const zipEntryIds: string[] = []
    const zipEntryOffsets: number[] = []
    let offset = 0

    super({
      transform(chunk, controller) {
        const localFileHeaderIndex = indexOfLocalFileHeader(chunk)

        if (localFileHeaderIndex !== -1) {
          const localFileHeader = parseLocalFileHeader(chunk.subarray(localFileHeaderIndex, chunk.length))

          if (localFileHeader !== null) {
            zipEntryIds.push(localFileHeader.extraField)
            zipEntryOffsets.push(offset + localFileHeaderIndex)
          }
        }

        offset += chunk.length
        controller.enqueue(chunk)
      },

      flush(controller) {
        const centralDirectoryHeaderDatas = zipEntryIds
          .map(zipEntryId => internalMap.get(zipEntryId))
          .filter(maybeCDH => maybeCDH !== undefined)
          .map((cDH, i) => ({ ...cDH, offset: zipEntryOffsets[i] }))

        if (centralDirectoryHeaderDatas.length !== zipEntryIds.length) {
          throw new Error("Central Directory Headers mismatch")
        }

        const eocd = createEndOfCentralDirectory({
          centralDirectoryHeaderDatas,
          offset
        })

        centralDirectoryHeaderDatas.forEach(cDHData => controller.enqueue(createCentralDirectoryHeader(cDHData)))
        controller.enqueue(eocd)
      }
    })
  }
}