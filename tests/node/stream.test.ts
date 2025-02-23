import { stat, writeFile, mkdir, readFile, rm } from "node:fs/promises"
import { ZipEntryStream, ZipStream } from "../../src/stream.ts"
import { createReadStream, ReadStream } from "node:fs"
import { describe, it } from "node:test"
import assert from "node:assert"
import { exec as _exec } from "node:child_process"
import util from "node:util"

const exec = util.promisify(_exec)

async function getFile(fileName: string) {
  const metadata = await stat(`./tests/assets/${fileName}`)
  const imageFile = ReadStream.toWeb(createReadStream(`./tests/assets/${fileName}`)) as ReadableStream<Uint8Array>

  return {
    name: fileName,
    size: metadata.size,
    lastModified: metadata.mtime.getTime(),
    stream: () => imageFile
  }
}

async function hasFilesDiff(filePath1: string, filePath2: string) {
  const file1 = await readFile(filePath1)
  const file2 = await readFile(filePath2)

  // @ts-expect-error https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/symmetricDifference
  return new Set(file1).symmetricDifference(new Set(file2)).size !== 0
}

describe("ZipStream", () => {
  it("ファイル一つ", async () => {
    const outputDirPath = "./tests/assets/singleFile"
    const zipFilePath = "./tests/assets/singleFile.zip"

    try {
      const filePaths = [ "test.txt" ]
      const files = await Promise.all(filePaths.map(filePath => getFile(filePath)))
      const zipStream = new ZipStream()

      // await したら駄目、stream と writeFile でデッドロックになる
      const writeFilePromise = writeFile(zipFilePath, zipStream.readable)

      for (const file of files) {
        await file
          .stream()
          .pipeThrough(
            new ZipEntryStream({ fileName: file.name, lastModified: file.lastModified })
          )
          .pipeTo(zipStream.writable, { preventClose: true })
      }

      await zipStream.writable.close()
      await writeFilePromise

      await mkdir(outputDirPath)
      await assert.doesNotReject(exec(`tar -xf ${zipFilePath} -C ${outputDirPath}`), "cmd での解凍に失敗")

      const hasDiffResults = await Promise.all(filePaths.map(filePath => hasFilesDiff(`./tests/assets/${filePath}`, `${outputDirPath}/${filePath}`)))

      assert.ok(hasDiffResults.every(result => result === false), "バイナリが一致しなかった")
    } finally {
      await rm(zipFilePath, { force: true })
      await rm(outputDirPath, { force: true, recursive: true })
    }
  })

  it("ファイル複数", async () => {
    const outputDirPath = "./tests/assets/multipleFile"
    const zipFilePath = "./tests/assets/multipleFile.zip"

    try {
      const filePaths = [
        // Photo by BALAZS GABOR on Unsplash
        // https://unsplash.com/@balazsgabor17
        "image1.jpg",
        // Photo by Colin Watts on Unsplash
        // https://unsplash.com/@colinwatts
        "image2.jpg",
        // Photo by Kevin Charit on Unsplash
        // https://unsplash.com/@kevin_charit
        "image3.jpg",
        "test.txt",
        "テスト.txt"
      ]
      const files = await Promise.all(filePaths.map(filePath => getFile(filePath)))
      const zipStream = new ZipStream()
      const writeFilePromise = writeFile(zipFilePath, zipStream.readable)

      for (const file of files) {
        await file
          .stream()
          .pipeThrough(
            new ZipEntryStream({ fileName: file.name, lastModified: file.lastModified })
          )
          .pipeTo(zipStream.writable, { preventClose: true })
      }

      await zipStream.writable.close()
      await writeFilePromise

      await mkdir(outputDirPath)
      await assert.doesNotReject(exec(`tar -xf ${zipFilePath} -C ${outputDirPath}`), "cmd での解凍に失敗")

      const hasDiffResults = await Promise.all(filePaths.map(filePath => hasFilesDiff(`./tests/assets/${filePath}`, `${outputDirPath}/${filePath}`)))

      assert.ok(hasDiffResults.every(result => result === false), "バイナリが一致しなかった")
    } finally {
      await rm(zipFilePath, { force: true })
      await rm(outputDirPath, { force: true, recursive: true })
    }
  })

  it("細切れの Stream で動作確認", async () => {
    const outputDirPath = "./tests/assets/chunkedStream"
    const zipFilePath = "./tests/assets/chunkedStream.zip"

    try {
      const filePaths = [
        // Photo by BALAZS GABOR on Unsplash
        // https://unsplash.com/@balazsgabor17
        "image1.jpg",
        // Photo by Colin Watts on Unsplash
        // https://unsplash.com/@colinwatts
        "image2.jpg",
        // Photo by Kevin Charit on Unsplash
        // https://unsplash.com/@kevin_charit
        "image3.jpg",
        "test.txt",
        "テスト.txt"
      ]
      const files = await Promise.all(filePaths.map(filePath => getFile(filePath)))
      const zipStream = new ZipStream()
      const writeFilePromise = writeFile(zipFilePath, zipStream.readable)

      for (const file of files) {
        await file
          .stream()
          .pipeThrough(
            new TransformStream({
              transform(chunk, controller) {
                const chunkSize = 12

                for (let i = 0; i < chunk.byteLength; i += chunkSize) {
                  const subChunk = chunk.slice(i, i + chunkSize)

                  controller.enqueue(subChunk)
                }
              }
            })
          )
          .pipeThrough(
            new ZipEntryStream({ fileName: file.name, lastModified: file.lastModified })
          )
          .pipeTo(zipStream.writable, { preventClose: true })
      }

      await zipStream.writable.close()
      await writeFilePromise

      await mkdir(outputDirPath)
      await assert.doesNotReject(exec(`tar -xf ${zipFilePath} -C ${outputDirPath}`), "cmd での解凍に失敗")

      const hasDiffResults = await Promise.all(filePaths.map(filePath => hasFilesDiff(`./tests/assets/${filePath}`, `${outputDirPath}/${filePath}`)))

      assert.ok(hasDiffResults.every(result => result === false), "バイナリが一致しなかった")
    } finally {
      await rm(zipFilePath, { force: true })
      await rm(outputDirPath, { force: true, recursive: true })
    }
  })
})
