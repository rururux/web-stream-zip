import { describe, it } from "node:test"
import assert from "node:assert"
import { getZipContentType, getZipContentDisposition } from "../src/utils.ts"

describe("utils", () => {
  it("getZipContentType", () => {
    assert.equal(
      getZipContentType(),
      "application/zip"
    )
  })

  it("getZipContentDisposition", () => {
    assert.equal(
      getZipContentDisposition("test.zip"),
      "attachment: filename=\"test.zip\""
    )
    assert.equal(
      getZipContentDisposition("again.zip"),
      "attachment: filename=\"again.zip\""
    )
    assert.equal(
      getZipContentDisposition("wrong-extension.exe"),
      "attachment: filename=\"wrong-extension.exe\""
    )
  })
})