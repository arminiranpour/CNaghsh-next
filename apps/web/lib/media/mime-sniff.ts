const PROBE_LENGTH = 512;

const sliceToAscii = (bytes: Uint8Array, start: number, length: number) => {
  const end = Math.min(bytes.length, start + length);
  return Array.from(bytes.slice(start, end))
    .map((code) => String.fromCharCode(code))
    .join("");
};

const sniffFromBytes = (bytes: Uint8Array): string | null => {
  if (bytes.length >= 12) {
    const box = sliceToAscii(bytes, 4, 4);
    if (box === "ftyp") {
      const brand = sliceToAscii(bytes, 8, 4).trim().toLowerCase();
      if (brand.startsWith("qt")) {
        return "video/quicktime";
      }
      return "video/mp4";
    }
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "video/webm";
  }
  return null;
};

export const sniffMimeFromBuffer = (buffer: Uint8Array) => {
  return sniffFromBytes(buffer);
};

export const sniffMimeFromFile = async (file: File) => {
  const blob = file.slice(0, PROBE_LENGTH);
  const arrayBuffer = await blob.arrayBuffer();
  return sniffFromBytes(new Uint8Array(arrayBuffer));
};
