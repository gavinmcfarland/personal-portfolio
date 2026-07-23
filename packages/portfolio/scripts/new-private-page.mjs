#!/usr/bin/env node
/* Generate a password-protected private canvas page.

   Writes an encrypted record to public/private/<slug>.json (ciphertext only —
   the board never ships in the clear) and prints the shareable URL plus the
   password. The slug is random and unguessable; the password is the actual
   access control.

   The record starts as a blank board. To author it: run `pnpm dev`, open
   /private/<slug>, unlock with the password, and edit — each save re-encrypts
   and writes this file back (dev only). Recipients on the deployed site get a
   read-only canvas. Then `git add public/private && git commit && deploy`, and
   send the URL + password to the recipient out-of-band (never commit the
   password).

   Usage:
     pnpm --filter portfolio private:new [--password <pw>] [--base-url <url>]

   With no --password, a strong one is generated and printed once. */

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { encryptBoard } from "../src/lib/privateCrypto.js";

const here = dirname(fileURLToPath(import.meta.url));
const publicPrivateDir = join(here, "..", "public", "private");

// Slug + password alphabets: unambiguous (no 0/O/1/l/I) so a link or password
// read aloud or copied by hand doesn't get mangled.
const SLUG_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
const PW_ALPHABET =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";

function randomFrom(alphabet, length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function getArg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const password = getArg("password") || randomFrom(PW_ALPHABET, 16);
const generatedPassword = !getArg("password");
const baseUrl = (getArg("base-url") || "").replace(/\/$/, "");
const slug = randomFrom(SLUG_ALPHABET, 12);

// A blank starting board — the owner authors it locally (dev), which re-encrypts
// and overwrites this file. Until then the payload is really just a password
// verifier over an empty board.
const record = await encryptBoard(password, null);

await mkdir(publicPrivateDir, { recursive: true });
await writeFile(
  join(publicPrivateDir, `${slug}.json`),
  JSON.stringify(record) + "\n",
);

const url = `${baseUrl}/private/${slug}`;

console.log("\n  Private canvas page created\n");
console.log(`  URL       ${baseUrl ? url : `/private/${slug}  (prefix with your domain)`}`);
console.log(`  Password  ${password}${generatedPassword ? "  (generated — save it now, it is not stored)" : ""}`);
console.log(`  File      public/private/${slug}.json\n`);
console.log("  Next: run `pnpm dev`, open the URL, unlock, and author the canvas.");
console.log("        Then commit the file, deploy, and share the URL + password separately.\n");
