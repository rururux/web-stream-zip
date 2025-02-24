import { assert } from "jsr:@std/assert"
import { ZipStream, ZipEntryStream } from "../../index.ts"

async function getFile(fileName: string) {
  const metadata = await Deno.stat(`tests/assets/${fileName}`)
  const imageFile = await Deno.open(`tests/assets/${fileName}`, { read: true })

  return {
    name: fileName,
    size: metadata.size,
    lastModified: metadata.mtime?.getTime() ?? 0,
    stream: () => imageFile.readable
  }
}

async function hasFilesDiff(filePath1: string, filePath2: string) {
  const file1 = await Deno.readFile(filePath1)
  const file2 = await Deno.readFile(filePath2)

  return file1.length !== file2.length || file1.some((byte, i) => byte !== file2[i])
}

Deno.test("ファイル一つ", async () => {
  const outputDirPath = "tests/assets/singleFile"
  const zipFilePath = "tests/assets/singleFile.zip"

  try {
    const filePaths = [ "test.txt" ]
    const files = await Promise.all(filePaths.map(filePath => getFile(filePath)))
    const zipStream = new ZipStream()

      // await したら駄目、stream と writeFile でデッドロックになる
      const writeFilePromise = Deno.writeFile(zipFilePath, zipStream.readable)

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

      await Deno.mkdir(outputDirPath)

      const commandResult = await new Deno.Command(`tar`, {
        args: [ "-xf", zipFilePath, "-C", outputDirPath]
      }).output()

      assert(commandResult.success !== false)

      const hasDiffResults = await Promise.all(filePaths.map(filePath => hasFilesDiff(`./tests/assets/${filePath}`, `${outputDirPath}/${filePath}`)))

    assert(hasDiffResults.every(result => result === false), "バイナリが一致しなかった")
  } finally {
    await Deno.remove(zipFilePath)
    await Deno.remove(outputDirPath, { recursive: true })
  }
})

Deno.test("ファイル複数", async () => {
  const outputDirPath = "tests/assets/multipleFile"
    const zipFilePath = "tests/assets/multipleFile.zip"

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

      // await したら駄目、stream と writeFile でデッドロックになる
      const writeFilePromise = Deno.writeFile(zipFilePath, zipStream.readable)

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

      await Deno.mkdir(outputDirPath)

      const commandResult = await new Deno.Command(`tar`, {
        args: [ "-xf", zipFilePath, "-C", outputDirPath]
      }).output()

      assert(commandResult.success !== false)

      const hasDiffResults = await Promise.all(filePaths.map(filePath => hasFilesDiff(`./tests/assets/${filePath}`, `${outputDirPath}/${filePath}`)))

    assert(hasDiffResults.every(result => result === false), "バイナリが一致しなかった")
  } finally {
    await Deno.remove(zipFilePath)
    await Deno.remove(outputDirPath, { recursive: true })
  }
})

Deno.test("細切れの Stream で動作確認", async () => {
  const outputDirPath = "tests/assets/chunkedStream"
    const zipFilePath = "tests/assets/chunkedStream.zip"

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

      // await したら駄目、stream と writeFile でデッドロックになる
      const writeFilePromise = Deno.writeFile(zipFilePath, zipStream.readable)

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

      await Deno.mkdir(outputDirPath)

      const commandResult = await new Deno.Command(`tar`, {
        args: [ "-xf", zipFilePath, "-C", outputDirPath]
      }).output()

      assert(commandResult.success !== false)

      const hasDiffResults = await Promise.all(filePaths.map(filePath => hasFilesDiff(`./tests/assets/${filePath}`, `${outputDirPath}/${filePath}`)))

    assert(hasDiffResults.every(result => result === false), "バイナリが一致しなかった")
  } finally {
    await Deno.remove(zipFilePath)
    await Deno.remove(outputDirPath, { recursive: true })
  }
})