import { LOCAL_FILE_HEADER_FIXED_SIZE } from "./record.ts"

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50
// little endian
const LOCAL_FILE_HEADER_SIGNATURE_BYTES = [ 0x04, 0x03, 0x4b, 0x50 ].reverse()

export function indexOfLocalFileHeader(data: Uint8Array) {
  const dataLenght = data.length
  let index = 0

  while(index < dataLenght) {
    index = data.indexOf(LOCAL_FILE_HEADER_SIGNATURE_BYTES[0], index)

    if (index === -1) break
    if (
      data[index + 1] === LOCAL_FILE_HEADER_SIGNATURE_BYTES[1] &&
      data[index + 2] === LOCAL_FILE_HEADER_SIGNATURE_BYTES[2] &&
      data[index + 3] === LOCAL_FILE_HEADER_SIGNATURE_BYTES[3]
    ) {
      return index
    }

    index++
  }

  return -1
}

const textDecoder = new TextDecoder()

export function parseLocalFileHeader(data: Uint8Array) {
  const dataView = new DataView(data.buffer)

  if (
    dataView.getUint32(0, true) !== LOCAL_FILE_HEADER_SIGNATURE ||
    // version needed to extract
    dataView.getUint16(4, true) !== 20 ||
    // general purpose bit flag
    dataView.getUint16(6, true) !== 0x0808 ||
    // compression method  (deflate)
    dataView.getUint16(8, true) !== 8
  ) {
    // not valid
    return null
  }

  const fileNameLength = dataView.getUint16(26, true)
  const extraFieldLength = dataView.getUint16(28, true)
  const extraFieldBytes = data.subarray(
    LOCAL_FILE_HEADER_FIXED_SIZE + fileNameLength + 4,
    LOCAL_FILE_HEADER_FIXED_SIZE + fileNameLength + 4 + extraFieldLength
  )
  const extraField = textDecoder.decode(extraFieldBytes)

  return { extraField }
}