import type { CentralDirectoryHeaderData, DataDescriptorData, EndOfCentralDirectoryData, LocalFileHeaderData } from "./types.ts"

export const LOCAL_FILE_HEADER_FIXED_SIZE = 30
export const DATA_DESCRIPTOR_FIXED_SIZE = 12
export const CENTRAL_DIRECTORY_HEADER_FIXED_SIZE = 46
export const END_OF_CENTRAL_DIRECTORY_FIXED_SIZE = 22

const EXTRA_FIELD_HEADER_SIZE = 4

export function createLocalFileHeader({ fileName, lastModified, extraField }: LocalFileHeaderData) {
  const textEncoder = new TextEncoder()
  const fileNameBytes = textEncoder.encode(fileName)
  const fileNameBytesLength = fileNameBytes.length
  const extraFieldBytes = textEncoder.encode(extraField ?? "")
  const extraFieldBytesLength = extraFieldBytes.length
  const dosDateTime = createMsDosTimestamp(lastModified)
  const buffer = new ArrayBuffer(
    LOCAL_FILE_HEADER_FIXED_SIZE +
    fileNameBytesLength +
    (EXTRA_FIELD_HEADER_SIZE + extraFieldBytesLength)
  )
  const dataView = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // Local File Header Signature
  dataView.setUint32(0, 0x04034b50, true)
  // version needed to extract  (2.0)
  dataView.setUint16(4, 20, true)
  // general purpose bit flag  (set bit 3 for data discriptor & 11 for UTF-8)
  dataView.setUint16(6, 0x0808, true)
  // compression method  (deflate)
  dataView.setUint16(8, 8, true)
  // last mod file time
  dataView.setUint16(10, dosDateTime.dosTime, true)
  // last mod file date
  dataView.setUint16(12, dosDateTime.dosDate, true)
  // crc-32 (skip)
  dataView.setUint32(14, 0, true)
  // compressed size (skip)
  dataView.setUint32(18, 0, true)
  // uncompressed size (skip)
  dataView.setUint32(22, 0, true)
  // file name length
  dataView.setUint16(26, fileNameBytesLength, true)
  // extra field length
  dataView.setUint16(28, EXTRA_FIELD_HEADER_SIZE + extraFieldBytesLength, true)

  // set filename
  bytes.set(fileNameBytes, LOCAL_FILE_HEADER_FIXED_SIZE)

  // set extra field
  const extraFiledOffset = LOCAL_FILE_HEADER_FIXED_SIZE + fileNameBytesLength

  dataView.setUint16(extraFiledOffset, 0xFFFF, true)
  dataView.setUint16(extraFiledOffset + 2, extraFieldBytesLength, true)

  bytes.set(extraFieldBytes, extraFiledOffset + EXTRA_FIELD_HEADER_SIZE)

  return bytes
}

export function createDataDescriptor({ crc32, compressedSize, uncompressedSize }: DataDescriptorData) {
  const buffer = new ArrayBuffer(DATA_DESCRIPTOR_FIXED_SIZE)
  const dataView = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  dataView.setUint32(0, crc32, true)
  dataView.setUint32(4, compressedSize, true)
  dataView.setUint32(8, uncompressedSize, true)

  return bytes
}

export function createCentralDirectoryHeader({ fileName, crc32, compressedSize, uncompressedSize, offset, lastModified, extraField }: CentralDirectoryHeaderData) {
  const textEncoder = new TextEncoder()
  const fileNameBytes = textEncoder.encode(fileName)
  const fileNameBytesLength = fileNameBytes.length
  const extraFieldBytes = textEncoder.encode(extraField ?? "")
  const extraFieldBytesLength = extraFieldBytes.length
  const dosDateTime = createMsDosTimestamp(lastModified)
  const buffer = new ArrayBuffer(
    CENTRAL_DIRECTORY_HEADER_FIXED_SIZE +
    fileNameBytesLength +
    (EXTRA_FIELD_HEADER_SIZE + extraFieldBytesLength)
  )
  const dataView = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // central file header signature   4 bytes  (0x02014b50)
  dataView.setUint32(0, 0x02014b50, true)
  // version made by                 2 bytes
  dataView.setUint16(4, 0x031E, true)
  // version needed to extract       2 bytes  (2.0)
  dataView.setUint16(6, 20, true)
  // general purpose bit flag        2 bytes  (set bit 3 for data discriptor & 11 for UTF-8)
  dataView.setUint16(8, 0x0808, true)
  // compression method              2 bytes  (deflate)
  dataView.setUint16(10, 8, true)
  // last mod file time              2 bytes
  dataView.setUint16(12, dosDateTime.dosTime, true)
  // last mod file date              2 bytes
  dataView.setUint16(14, dosDateTime.dosDate, true)
  // crc-32                          4 bytes
  dataView.setUint32(16, crc32, true)
  // compressed size                 4 bytes
  dataView.setUint32(20, compressedSize, true)
  // uncompressed size               4 bytes
  dataView.setUint32(24, uncompressedSize, true)
  // file name length                2 bytes
  dataView.setUint16(28, fileNameBytesLength, true)
  // extra field length              2 bytes
  dataView.setUint16(30, EXTRA_FIELD_HEADER_SIZE + extraFieldBytesLength, true)
  // file comment length             2 bytes
  dataView.setUint16(32, 0, true)
  // disk number start               2 bytes
  dataView.setUint16(34, 0, true)
  // internal file attributes        2 bytes
  dataView.setUint16(36, 0, true)
  // external file attributes        4 bytes
  dataView.setUint32(38, 0, true)
  // relative offset of local header 4 bytes
  dataView.setUint32(42, offset, true)

  // file name (variable size)
  bytes.set(fileNameBytes, CENTRAL_DIRECTORY_HEADER_FIXED_SIZE)

  const extraFiledOffset = CENTRAL_DIRECTORY_HEADER_FIXED_SIZE + fileNameBytesLength

  dataView.setUint16(extraFiledOffset, 0xFFFF, true)
  dataView.setUint16(extraFiledOffset + 2, extraFieldBytesLength, true)

  bytes.set(extraFieldBytes, extraFiledOffset + EXTRA_FIELD_HEADER_SIZE)

  return bytes
}

export function createEndOfCentralDirectory({ centralDirectoryHeaderDatas, offset }: EndOfCentralDirectoryData) {
  const buffer = new ArrayBuffer(END_OF_CENTRAL_DIRECTORY_FIXED_SIZE)
  const dataView = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  const textEncoder = new TextEncoder()
  const centralDirectorySize = centralDirectoryHeaderDatas.reduce((prv, cur) => (
    prv + (
      CENTRAL_DIRECTORY_HEADER_FIXED_SIZE +
      textEncoder.encode(cur.fileName).byteLength +
      (EXTRA_FIELD_HEADER_SIZE + textEncoder.encode(cur.extraField).byteLength)
    )
  ), 0)

  // end of central dir signature    4 bytes  (0x06054b50)
  dataView.setUint32(0, 0x06054b50, true)
  // number of this disk             2 bytes
  dataView.setUint16(4, 0, true)
  // number of the disk with the
  // start of the central directory  2 bytes
  dataView.setUint16(6, 0, true)
  // total number of entries in the
  // central directory on this disk  2 bytes
  dataView.setUint16(8, centralDirectoryHeaderDatas.length, true)
  // total number of entries in
  // the central directory           2 bytes
  dataView.setUint16(10, centralDirectoryHeaderDatas.length, true)
  // size of the central directory   4 bytes
  dataView.setUint32(12, centralDirectorySize, true)
  // offset of start of central
  // directory with respect to
  // the starting disk number        4 bytes
  dataView.setUint32(16, offset, true)
  // .ZIP file comment length        2 bytes (skip)
  dataView.setUint16(20, 0, true)
  // .ZIP file comment (variable size) (skip)

  return bytes
}

// 参考: https://learn.microsoft.com/ja-jp/windows/win32/api/winbase/nf-winbase-filetimetodosdatetime
function createMsDosTimestamp(unixTimestamp: number) {
  const date = new Date(unixTimestamp)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = Math.floor(date.getSeconds() / 2)

  return {
    // (value << (bits 位置の始まり))
    dosDate: ((year - 1980) << 9) | (month << 5) | day,
    dosTime: (hours << 11) | (minutes << 5) | seconds
  }
}