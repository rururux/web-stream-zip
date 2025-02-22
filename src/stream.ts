import { CRC32Calculator } from "./crc32.ts"
import { createCentralDirectoryHeader, createDataDescriptor, createEndOfCentralDirectory, createLocalFileHeader, DATA_DESCRIPTOR_FIXED_SIZE, LOCAL_FILE_HEADER_FIXED_SIZE } from "./record.ts"
import type { CentralDirectoryHeaderData, FileLike } from "./types.ts"

type ZipEntryData = {
  offset: number
  crc32Ref: { current: number }
  fileName: string
  fileSize: number
  lastModified: number
  getCentralDirectoryHeaderData: (centralDirectoryHeaderData: CentralDirectoryHeaderData) => void
}

// 本当は ZipEntryStream の中で CompressionStream を使えたらいいのだが、
// 何故か node v23.8.0 では deflate-raw の時だけ
// reader.read() の promise が永遠に resolve しないバグ？がある
// 一応 pipeThrough は使える
class CRC32CalculatorStream extends TransformStream {
  constructor({
    getResult
  }: { getResult: (result: number) => void }) {
    const calculator = new CRC32Calculator()

    super({
      transform(chunk, controller) {
        calculator.add(chunk)
        controller.enqueue(chunk)
      },

      flush() {
        getResult(calculator.finish())
      }
    })
  }
}

class ZipEntryStream extends TransformStream<ArrayBuffer> {
  constructor ({
    offset,
    crc32Ref,
    fileName,
    fileSize,
    lastModified,
    getCentralDirectoryHeaderData: getCentralDirectoryHeader
  }: ZipEntryData) {
    const uncompressedSize = fileSize
    let compressedSize = 0

    super({
      start(controller) {
        const localFileHeader = createLocalFileHeader({ fileName, lastModified })

        controller.enqueue(localFileHeader)
      },

      async transform(chunk, controller) {
        controller.enqueue(chunk)
        compressedSize += chunk.byteLength
      },

      async flush(controller) {
        const crc32 = crc32Ref.current
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
        const crc32Ref = { current: 0 }
        const getResult = (result: number) => crc32Ref.current = result

        await zipEntryData.stream()
          .pipeThrough(
            new CRC32CalculatorStream({ getResult })
          )
          .pipeThrough(
            new CompressionStream("deflate-raw")
          )
          .pipeThrough(
            new ZipEntryStream({
              fileName: zipEntryData.name,
              fileSize: zipEntryData.size,
              offset: this.#getOffset(),
              crc32Ref,
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