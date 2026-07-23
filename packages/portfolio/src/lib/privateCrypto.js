/* Password-based encryption for privately shared canvas pages.

   A private page ships as a static JSON record of ciphertext — never the board
   itself. The board (and a magic token that lets us verify the password without
   storing a hash) is encrypted with an AES-GCM key derived from the password via
   PBKDF2. Without the password there is nothing readable in the file; a wrong
   password fails the GCM auth tag, which is how we detect it.

   The same module runs in two places: the Node generator script (scripts/
   new-private-page.mjs) writes records, and the browser route (pages/
   PrivatePage.jsx) reads them. Both reach Web Crypto through globalThis.crypto,
   so the format stays identical on either side. */

const MAGIC = "canvas-private-v1";
const ITERATIONS = 200_000;

const subtle = globalThis.crypto.subtle;
const te = new TextEncoder();
const td = new TextDecoder();

function bytesToB64(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password, salt, iterations) {
  const baseKey = await subtle.importKey(
    "raw",
    te.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/* Encrypt `board` under `password`, returning the plain-JSON record to write to
   public/private/<slug>.json. `board` may be null for a blank canvas. */
export async function encryptBoard(password, board) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const plaintext = te.encode(JSON.stringify({ magic: MAGIC, board: board ?? null }));
  const ct = new Uint8Array(
    await subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext),
  );
  return {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iter: ITERATIONS,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ct: bytesToB64(ct),
  };
}

/* Decrypt a record with `password`. Resolves to the stored board (or null for a
   blank canvas). Throws on a wrong password or a tampered/invalid record. */
export async function decryptBoard(password, record) {
  const salt = b64ToBytes(record.salt);
  const iv = b64ToBytes(record.iv);
  const key = await deriveKey(password, salt, record.iter || ITERATIONS);
  let plaintext;
  try {
    plaintext = await subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      b64ToBytes(record.ct),
    );
  } catch {
    throw new Error("Incorrect password");
  }
  const obj = JSON.parse(td.decode(plaintext));
  if (obj.magic !== MAGIC) throw new Error("Incorrect password");
  return obj.board ?? null;
}
