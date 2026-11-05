// Deterministic, uncompressed ZIP entries; no timestamps or build dependencies.
export function createStoredZip(entries) {
  let offset = 0;
  const localParts = [];
  const directoryParts = [];

  for (const [name, data] of entries) {
    const filename = Buffer.from(name);
    const checksum = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(filename.length, 26);

    const directoryHeader = Buffer.alloc(46);
    directoryHeader.writeUInt32LE(0x02014b50);
    directoryHeader.writeUInt16LE(20, 4);
    directoryHeader.writeUInt16LE(20, 6);
    directoryHeader.writeUInt32LE(checksum, 16);
    directoryHeader.writeUInt32LE(data.length, 20);
    directoryHeader.writeUInt32LE(data.length, 24);
    directoryHeader.writeUInt16LE(filename.length, 28);
    directoryHeader.writeUInt32LE(offset, 42);

    localParts.push(localHeader, filename, data);
    directoryParts.push(directoryHeader, filename);
    offset += localHeader.length + filename.length + data.length;
  }

  const directory = Buffer.concat(directoryParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, directory, end]);
}

function crc32(data) {
  let checksum = 0xffffffff;
  for (const byte of data) {
    checksum ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      checksum = (checksum >>> 1) ^ ((checksum & 1) ? 0xedb88320 : 0);
    }
  }
  return (checksum ^ 0xffffffff) >>> 0;
}
