export class CRC32Calculator {
  #value = 0xFFFFFFFF

  constructor() {}

  add(data: Uint8Array) {
    for (const byte of data) {
      this.#value = this.#value ^ byte

      for(let i = 0; i < 8; i++) {
        this.#value = ((this.#value & 1) === 1)
          ? (this.#value >>> 1) ^ 0xEDB88320
          : this.#value >>> 1
      }
    }

    return this
  }

  finish() {
    // 符号なしに変換
    return (this.#value ^ 0xFFFFFFFF) >>> 0
  }
}