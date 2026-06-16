type NodeCrypto = typeof import("crypto");

const NATIVE_HASH_PREFERENCE = ["xxh3", "xxhash64", "xxhash", "md5", "sha1"];

export function hashArrayBuffer(buffer: ArrayBuffer): string {
  const nativeHash = hashWithNodeCrypto(buffer);
  if (nativeHash) return nativeHash;
  return `fnv1a32x2:${hashWithFnv1a32x2(buffer)}`;
}

function hashWithNodeCrypto(buffer: ArrayBuffer): string | null {
  const crypto = loadNodeCrypto();
  if (!crypto) return null;

  const available = new Set(crypto.getHashes().map((name) => name.toLowerCase()));
  const algorithm = NATIVE_HASH_PREFERENCE.find((name) => available.has(name));
  if (!algorithm) return null;

  const hash = crypto.createHash(algorithm);
  hash.update(Buffer.from(buffer));
  return `${algorithm}:${hash.digest("hex")}`;
}

function loadNodeCrypto(): NodeCrypto | null {
  const requireFn = typeof require === "function" ? require : null;
  if (!requireFn) return null;

  try {
    return requireFn("crypto") as NodeCrypto;
  } catch {
    return null;
  }
}

function hashWithFnv1a32x2(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;

  for (const byte of bytes) {
    first ^= byte;
    first = Math.imul(first, 0x01000193);
    second ^= byte;
    second = Math.imul(second, 0x85ebca6b);
  }

  return `${toHex32(first)}${toHex32(second)}`;
}

function toHex32(value: number): string {
  return (value >>> 0).toString(16).padStart(8, "0");
}
