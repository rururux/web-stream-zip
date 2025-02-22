import assert from "node:assert"
import { describe, it } from "node:test"
import { CRC32Calculator } from "../src/crc32.ts"
import { readFile } from "node:fs/promises"
import zlib from "node:zlib"

describe("CRC32Calculator", () => {
  it("test.txt", async () => {
    const calculator = new CRC32Calculator()
    const fileBuffer = await readFile("./tests/assets/test.txt")

    calculator.add(fileBuffer)

    assert.equal(
      calculator.finish(),
      zlib.crc32(fileBuffer)
    )
  })

  it("image1.jpg", async () => {
    const calculator = new CRC32Calculator()
    const fileBuffer = await readFile("./tests/assets/image1.jpg")

    calculator.add(fileBuffer)

    assert.equal(
      calculator.finish(),
      zlib.crc32(fileBuffer)
    )
  })
})