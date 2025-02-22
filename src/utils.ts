export function getZipContentType() {
  return "application/zip"
}

export function getZipContentDisposition(fileName: string) {
  return `attachment: filename="${fileName}"`
}