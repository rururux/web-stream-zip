import { describe, it, expect } from "vitest"
import assert from "node:assert"
import { getZipContentType, getZipContentDisposition } from "../../src/utils.ts"

describe("utils", () => {
  it("getZipContentType", () => {
    expect(getZipContentType()).equal("application/zip")
  })

  it("getZipContentDisposition", () => {
    expect(getZipContentDisposition("test.zip"))
      .equal("attachment: filename=\"test.zip\"")

    expect(getZipContentDisposition("again.zip"))
      .equal("attachment: filename=\"again.zip\"")

    expect(getZipContentDisposition("wrong-extension.exe"))
      .equal("attachment: filename=\"wrong-extension.exe\"")
  })
})