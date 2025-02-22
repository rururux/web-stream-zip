export type FileLike = {
  name: File["name"]
  size: File["size"]
  lastModified: File["lastModified"]
  stream: File["stream"]
}

export type LocalFileHeaderData = {
  fileName: string
  lastModified: number
}

export type DataDescriptorData = {
  crc32: number
  compressedSize: number
  uncompressedSize: number
}

export type CentralDirectoryHeaderData = {
  lastModified: number
  crc32: number
  compressedSize: number
  uncompressedSize: number
  offset: number
  fileName: string
}

export type EndOfCentralDirectoryData = {
  centralDirectoryHeaderDatas: CentralDirectoryHeaderData[]
  offset: number
}