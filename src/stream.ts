import { CRC32Calculator } from "./crc32.ts"
import { createCentralDirectoryHeader, createDataDescriptor, createEndOfCentralDirectory, createLocalFileHeader, DATA_DESCRIPTOR_FIXED_SIZE, LOCAL_FILE_HEADER_FIXED_SIZE } from "./record.ts"
import type { CentralDirectoryHeaderData, FileLike } from "./types.ts"

type ZipEntryData = {
  offset: number
  fileName: string
  lastModified: number
  getCentralDirectoryHeaderData: (centralDirectoryHeaderData: CentralDirectoryHeaderData) => void
}

// 何故か node v23.8.0 では deflate-raw の時だけ
// CompressionStream の reader.read() の promise が永遠に resolve しないバグ？がある
// 一応 pipeThrough や別の WritableStream を経由する方法は使える
class ZipEntryStream extends TransformStream<ArrayBuffer> {
  constructor ({
    offset,
    fileName,
    lastModified,
    getCentralDirectoryHeaderData: getCentralDirectoryHeader
  }: ZipEntryData) {
    const calculator = new CRC32Calculator()
    const compressionStream = new CompressionStream("deflate-raw")
    let writableStream: WritableStream<Uint8Array>
    let uncompressedSize = 0
    let compressedSize = 0
    let pipeToPromise: Promise<void>

    super({
      start(controller) {
        const localFileHeader = createLocalFileHeader({ fileName, lastModified })

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

        controller.enqueue(dataDescriptor)
        getCentralDirectoryHeader({
          lastModified,
          crc32,
          compressedSize,
          uncompressedSize,
          offset,
          fileName
        })
      }
    })
  }
}

export class ZipStream extends TransformStream {
  #fileGetters: (() => Promise<FileLike>)[]
  #getOffset: () => number
  #getCentralDirectoryHeaderData: (cDH: CentralDirectoryHeaderData) => void

  constructor(fileGetters: (() => Promise<FileLike>)[] = []) {
    const centralDirectoryHeaderDatas: CentralDirectoryHeaderData[] = []

    const getOffset = () => {
      const lastCentralDirectoryHeader = centralDirectoryHeaderDatas.at(-1)

      return lastCentralDirectoryHeader !== undefined
        ? (
            lastCentralDirectoryHeader.offset +
            LOCAL_FILE_HEADER_FIXED_SIZE +
            new TextEncoder().encode(lastCentralDirectoryHeader.fileName).byteLength +
            lastCentralDirectoryHeader.compressedSize +
            DATA_DESCRIPTOR_FIXED_SIZE
          )
        : 0
    }

    super({
      flush(controller) {
        const centralDirectoryHeaders = centralDirectoryHeaderDatas.map(createCentralDirectoryHeader)
        const eocd = createEndOfCentralDirectory({
          centralDirectoryHeaderDatas,
          offset: getOffset()
        })

        centralDirectoryHeaders.forEach(cDH => controller.enqueue(cDH))
        controller.enqueue(eocd)
      }
    })

    this.#fileGetters = fileGetters
    this.#getOffset = getOffset
    this.#getCentralDirectoryHeaderData = (cDH: CentralDirectoryHeaderData) => centralDirectoryHeaderDatas.push(cDH)

    this.#streamFiles()
      .catch(e => {
        throw new Error("Stream Error", { cause: e })
      })
  }

  async #streamFiles() {
    try {
      for (const fileGetter of this.#fileGetters) {
        const zipEntryData = await fileGetter()

        await zipEntryData.stream()
          .pipeThrough(
            new ZipEntryStream({
              fileName: zipEntryData.name,
              offset: this.#getOffset(),
              getCentralDirectoryHeaderData: this.#getCentralDirectoryHeaderData,
              ...zipEntryData
            })
          )
          .pipeTo(this.writable, { preventClose: true })
      }

      await this.writable.close()
    } catch (e) {
      await this.writable.abort(e)
    }
  }
}