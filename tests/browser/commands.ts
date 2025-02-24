import type { BrowserCommand } from "vitest/node"
import fs from "fs/promises"
import { exec as _exec } from "child_process"
import util from "util"

const exec = util.promisify(_exec)

declare module "@vitest/browser/context" {
  interface BrowserCommands {
    selectFile: (files: { name: string, mimeType: string, path: string }[]) => Promise<void>,

    downloadFile: () => Promise<string>,

    unZipFile: (fileName: string) => Promise<void>
  }
}

export const selectFile: BrowserCommand<[ files: { name: string, mimeType: string, path: string }[] ]> = async (ctx, files) => {
  if (ctx.provider.name !== "playwright") throw new Error("unsupported provider")

  const inputButton = ctx.iframe.getByTestId("filePicker")
  const fileDatas = await Promise.all(files.map(async ({ path, ...file }) => ({ ...file, buffer: await fs.readFile(path)  })))

  await inputButton.setInputFiles(fileDatas)
}

export const downloadFile: BrowserCommand<[]> = async ctx => {
  if (ctx.provider.name !== "playwright") throw new Error("unsupported provider")

  const waitDownload = ctx.page.waitForEvent("download")

  await ctx.iframe.getByRole("button").click()

  const download = await waitDownload
  const fileName = download.suggestedFilename()

  await download.saveAs("./tests/assets/" + fileName)

  return fileName
}

export const unZipFile: BrowserCommand<[ fileName: string ]> = async (ctx, fileName) => {
  if (ctx.provider.name !== "playwright") throw new Error("unsupported provider")

  const outputDirPath = "./tests/assets/" + fileName.replace(/\.zip$/, "")
  const zipFilePath = "./tests/assets/" + fileName

  try {
    await fs.mkdir(outputDirPath)
    await exec(`tar -xf ${zipFilePath} -C ${outputDirPath}`)
  } finally {
    await fs.rm(zipFilePath, { force: true })
    await fs.rm(outputDirPath, { force: true, recursive: true })
  }
}