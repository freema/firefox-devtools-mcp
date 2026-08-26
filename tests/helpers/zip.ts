/**
 * Minimal ZIP writer for test .xpi archives. Replaces a shell-out to `zip`,
 * which does not exist on Windows.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIR_SIGNATURE = 0x06054b50;
const METHOD_DEFLATE = 8;
const VERSION_NEEDED = 20;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let bit = 0; bit < 8; bit++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface Entry {
  name: string;
  crc: number;
  compressed: Buffer;
  uncompressedSize: number;
  offset: number;
}

function localHeader(entry: Entry, nameBytes: Buffer): Buffer {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(LOCAL_HEADER_SIGNATURE, 0);
  header.writeUInt16LE(VERSION_NEEDED, 4);
  header.writeUInt16LE(0, 6); // flags
  header.writeUInt16LE(METHOD_DEFLATE, 8);
  header.writeUInt16LE(0, 10); // mod time — fixed, for reproducible archives
  header.writeUInt16LE(0x0021, 12); // mod date — 1980-01-01, the ZIP epoch
  header.writeUInt32LE(entry.crc, 14);
  header.writeUInt32LE(entry.compressed.length, 18);
  header.writeUInt32LE(entry.uncompressedSize, 22);
  header.writeUInt16LE(nameBytes.length, 26);
  header.writeUInt16LE(0, 28); // extra field length
  return header;
}

function centralHeader(entry: Entry, nameBytes: Buffer): Buffer {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(CENTRAL_HEADER_SIGNATURE, 0);
  header.writeUInt16LE(VERSION_NEEDED, 4); // version made by
  header.writeUInt16LE(VERSION_NEEDED, 6); // version needed
  header.writeUInt16LE(0, 8); // flags
  header.writeUInt16LE(METHOD_DEFLATE, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0x0021, 14);
  header.writeUInt32LE(entry.crc, 16);
  header.writeUInt32LE(entry.compressed.length, 20);
  header.writeUInt32LE(entry.uncompressedSize, 24);
  header.writeUInt16LE(nameBytes.length, 28);
  header.writeUInt16LE(0, 30); // extra field length
  header.writeUInt16LE(0, 32); // comment length
  header.writeUInt16LE(0, 34); // disk number start
  header.writeUInt16LE(0, 36); // internal attributes
  header.writeUInt32LE(0, 38); // external attributes
  header.writeUInt32LE(entry.offset, 42);
  return header;
}

/** Writes `files` to `zipPath`, flattened to base names (`zip -j` behaviour). */
export function writeZip(zipPath: string, files: string[]): void {
  const chunks: Buffer[] = [];
  const entries: Array<{ entry: Entry; nameBytes: Buffer }> = [];
  let offset = 0;

  for (const file of files) {
    const contents = readFileSync(file);
    const nameBytes = Buffer.from(basename(file), 'utf8');
    const entry: Entry = {
      name: basename(file),
      crc: crc32(contents),
      compressed: deflateRawSync(contents),
      uncompressedSize: contents.length,
      offset,
    };
    const header = localHeader(entry, nameBytes);
    chunks.push(header, nameBytes, entry.compressed);
    offset += header.length + nameBytes.length + entry.compressed.length;
    entries.push({ entry, nameBytes });
  }

  const centralStart = offset;
  for (const { entry, nameBytes } of entries) {
    const header = centralHeader(entry, nameBytes);
    chunks.push(header, nameBytes);
    offset += header.length + nameBytes.length;
  }

  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_OF_CENTRAL_DIR_SIGNATURE, 0);
  end.writeUInt16LE(0, 4); // disk number
  end.writeUInt16LE(0, 6); // central directory start disk
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(offset - centralStart, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20); // comment length
  chunks.push(end);

  writeFileSync(zipPath, Buffer.concat(chunks));
}
