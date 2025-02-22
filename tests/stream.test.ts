import { stat, writeFile, mkdir, readFile, rm } from "node:fs/promises"
import { ZipStream } from "../src/stream.ts"
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

    try {
      const files = [ "test.txt" ]
      const zipStream = new ZipStream(
        files.map(file => (() => getFile(file)))
      )

      await writeFile("./tests/assets/singleFile.zip", zipStream.readable)
      await mkdir(outputDirPath)
      await assert.doesNotReject(exec(`tar -xf ./tests/assets/singleFile.zip -C ${outputDirPath}`), "cmd での解凍に失敗")

      const hasDiffResults = await Promise.all(files.map(file => hasFilesDiff(`./tests/assets/${file}`, `${outputDirPath}/${file}`)))

      assert.ok(hasDiffResults.every(result => result === false), "バイナリが一致しなかった")
    } finally {
      await rm("./tests/assets/singleFile.zip", { force: true })
      await rm(outputDirPath, { force: true, recursive: true })
    }
  })

  it("ファイル複数", async () => {
    const outputDirPath = "./tests/assets/multipleFile"

    try {
      const files = [
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
      const zipStream = new ZipStream(
        files.map(file => (() => getFile(file)))
      )
      const filePath = "./tests/assets/multipleFile.zip"

      await writeFile(filePath, zipStream.readable)
      await mkdir(outputDirPath)
      await assert.doesNotReject(exec(`tar -xf ${filePath} -C ${outputDirPath}`), "cmd での解凍に失敗")

      const hasDiffResults = await Promise.all(files.map(file => hasFilesDiff(`./tests/assets/${file}`, `${outputDirPath}/${file}`)))

      assert.ok(hasDiffResults.every(result => result === false), "バイナリが一致しなかった")
    } finally {
      await rm("./tests/assets/multipleFile.zip", { force: true })
      await rm(outputDirPath, { force: true, recursive: true })
    }
  })
})
