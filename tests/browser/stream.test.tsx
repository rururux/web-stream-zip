import { describe, it, expect } from "vitest"
import { commands } from "@vitest/browser/context"
import { render } from "vitest-browser-react"
import Page from "./src"

describe("ZipStream", () => {
  it("browser single file test", async () => {
    render(<Page />)

    await commands.selectFile([
      { name: "test.txt", mimeType: "text/plain", path: "./tests/assets/test.txt" }
    ])

    const fileName = await commands.downloadFile()

    await expect(commands.unZipFile(fileName)).resolves.toBeUndefined()
  })

  it("browser multiple file test", async () => {
    render(<Page />)

    await commands.selectFile([
      { name: "test.txt", mimeType: "text/plain", path: "./tests/assets/test.txt" },
      { name: "image1.jpg", mimeType: "image/jpg", path: "./tests/assets/image1.jpg" },
      { name: "image2.jpg", mimeType: "image/jpg", path: "./tests/assets/image2.jpg" },
      { name: "image3.jpg", mimeType: "image/jpg", path: "./tests/assets/image3.jpg" },
      { name: "テスト.txt", mimeType: "text/plain", path: "./tests/assets/テスト.txt" },
    ])

    const fileName = await commands.downloadFile()

    await expect(commands.unZipFile(fileName)).resolves.toBeUndefined()
  })
})