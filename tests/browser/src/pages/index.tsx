import { ChangeEvent, useState } from "react"
import styles from "./styles.module.css"
import { ZipStream, ZipEntryStream } from "../../../../index"

export default function Page() {
  const [ files, setFiles ] = useState<File[]>([])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const filesValue = e.currentTarget.files

    if (filesValue !== null) {
      setFiles([ ...filesValue ])
    }
  }

  const handleClick = async () => {
    const zipStream = new ZipStream()

    ;(async () => {
      for (const file of files) {
        await file
          .stream()
          .pipeThrough(
            new ZipEntryStream({ fileName: file.name, lastModified: file.lastModified })
          )
          .pipeTo(zipStream.writable, { preventClose: true })
      }

      await zipStream.writable.close()
    })()

    const blob = new Blob(await Array.fromAsync(zipStream.readable), { type: "application/zip" })
    const link = document.createElement("a")

    link.href = URL.createObjectURL(blob)
    link.download = "test.zip"
    link.click()

    URL.revokeObjectURL(link.href)
  }

  return (
    <div className={styles.container}>
      <input type="file" name="files" multiple accept="image/*" onChange={handleChange} />
      <button onClick={handleClick}>Download</button>
    </div>
  )
}