export type LocalFileHeaderData = {
  fileName: string
  lastModified: number
  extraField: string
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
  extraField: string
}

export type EndOfCentralDirectoryData = {
  centralDirectoryHeaderDatas: CentralDirectoryHeaderData[]
  offset: number
}