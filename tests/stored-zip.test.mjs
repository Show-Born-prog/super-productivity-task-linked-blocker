import test from 'node:test';
import assert from 'node:assert/strict';
import {createStoredZip} from '../scripts/stored-zip.mjs';

// Byte fixtures captured from the original builder before extracting the writer.
test('stored ZIP preserves empty and single-entry archives, including the known CRC32 vector', () => {
  assert.equal(createStoredZip([]).toString('hex'), '504b0506000000000000000000000000000000000000');
  const archive = createStoredZip([['test.txt', Buffer.from('123456789')]]);
  assert.equal(archive.toString('hex'),
    '504b0304140000000000000000002639f4cb090000000900000008000000746573742e747874313233343536373839' +
    '504b01021400140000000000000000002639f4cb0900000009000000080000000000000000000000000000000000746573742e747874' +
    '504b05060000000001000100360000002f0000000000');
});

test('stored ZIP preserves entry order, empty files and binary payloads without mutating input', () => {
  const entries = [['first.txt', Buffer.from('hello')], ['empty.bin', Buffer.alloc(0)],
    ['nested/bytes.bin', Buffer.from([0, 255, 128, 1])]];
  const before = entries.map(([name, data]) => [name, Buffer.from(data)]);
  const expected = Buffer.from(
    'UEsDBBQAAAAAAAAAAACGphA2BQAAAAUAAAAJAAAAZmlyc3QudHh0aGVsbG9QSwMEFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkAAABlbXB0eS5iaW5QSwMEFAAAAAAAAAAAACxDWNMEAAAABAAAABAAAABuZXN0ZWQvYnl0ZXMuYmluAP+AAVBLAQIUABQAAAAAAAAAAACGphA2BQAAAAUAAAAJAAAAAAAAAAAAAAAAAAAAAABmaXJzdC50eHRQSwECFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAACQAAAAAAAAAAAAAAAAAsAAAAZW1wdHkuYmluUEsBAhQAFAAAAAAAAAAAACxDWNMEAAAABAAAABAAAAAAAAAAAAAAAAAAUwAAAG5lc3RlZC9ieXRlcy5iaW5QSwUGAAAAAAMAAwCsAAAAhQAAAAAA',
    'base64');
  assert.deepEqual(createStoredZip(entries), expected);
  assert.deepEqual(entries, before);
  assert.deepEqual(createStoredZip(entries), expected, 'repeated builds must stay deterministic');
});
