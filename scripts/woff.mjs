/**
 * WOFF 1.0 → the sfnt (TTF/OTF) inside it, with the family renamed to one name across weights.
 *
 * Fontsource's static cuts name their family per weight ("Inter ExtraBold", "Inter Black"); a
 * renderer that matches family + weight (resvg's fontdb) then never finds weight 800 of "Inter"
 * and draws the 700 instead. Rewriting the name table's family IDs (1, 2, 4, 6, 16, 17) to the
 * family the runtime asks for fixes that; every other record (copyright, the OFL notice) is kept.
 */
import { inflateSync } from "node:zlib";

const WEIGHT_NAMES = { 100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black" };
const RENAMED = new Set([1, 2, 4, 6, 16, 17]);

const u16 = (v) => {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(v);
  return b;
};

const utf16be = (s) => {
  const b = Buffer.alloc(s.length * 2);
  for (let i = 0; i < s.length; i++) b.writeUInt16BE(s.charCodeAt(i), i * 2);
  return b;
};

function renameTable(name, family, weight, italic) {
  const count = name.readUInt16BE(2);
  const strings = name.readUInt16BE(4);
  const records = [];
  for (let i = 0; i < count; i++) {
    const o = 6 + i * 12;
    const [pid, eid, lid, nid, len, off] = [0, 2, 4, 6, 8, 10].map((k) => name.readUInt16BE(o + k));
    if (RENAMED.has(nid)) continue;
    records.push({ pid, eid, lid, nid, bytes: name.subarray(strings + off, strings + off + len) });
  }
  const wn = WEIGHT_NAMES[weight] ?? String(weight);
  const style = weight === 400 ? (italic ? "Italic" : "Regular") : italic ? `${wn} Italic` : wn;
  // Regular/Bold (and their italics) are the four styles ID 1/2 can name; any other weight goes in the family (ID 1) and in 16/17.
  const ribbi = weight === 400 || weight === 700;
  const sub = weight === 700 ? (italic ? "Bold Italic" : "Bold") : italic ? "Italic" : "Regular";
  const fields = {
    1: ribbi ? family : `${family} ${wn}`,
    2: ribbi ? sub : italic ? "Italic" : "Regular",
    4: `${family} ${style}`,
    6: `${family.replace(/\s+/g, "")}-${style.replace(/\s+/g, "")}`,
    16: family,
    17: style,
  };
  for (const [nid, s] of Object.entries(fields)) records.push({ pid: 3, eid: 1, lid: 0x409, nid: Number(nid), bytes: utf16be(s) });
  records.sort((a, b) => a.pid - b.pid || a.eid - b.eid || a.lid - b.lid || a.nid - b.nid);
  const head = [u16(0), u16(records.length), u16(6 + records.length * 12)];
  const data = [];
  let off = 0;
  for (const r of records) {
    head.push(u16(r.pid), u16(r.eid), u16(r.lid), u16(r.nid), u16(r.bytes.length), u16(off));
    data.push(r.bytes);
    off += r.bytes.length;
  }
  return Buffer.concat([...head, ...data]);
}

/** The sfnt a WOFF 1.0 file wraps; with `rename` ({ family, weight, italic }) its family is set to that name. */
export function woffToSfnt(buf, rename) {
  if (buf.toString("ascii", 0, 4) !== "wOFF") throw new Error("not a WOFF 1.0 file");
  const flavor = buf.readUInt32BE(4);
  const n = buf.readUInt16BE(12);
  const tables = [];
  for (let i = 0; i < n; i++) {
    const o = 44 + i * 20;
    const tag = buf.toString("latin1", o, o + 4);
    const off = buf.readUInt32BE(o + 4);
    const comp = buf.readUInt32BE(o + 8);
    const orig = buf.readUInt32BE(o + 12);
    const sum = buf.readUInt32BE(o + 16);
    const raw = buf.subarray(off, off + comp);
    let data = comp < orig ? inflateSync(raw) : Buffer.from(raw);
    if (rename && tag === "name") data = renameTable(data, rename.family, rename.weight, rename.italic);
    tables.push({ tag, sum, data });
  }
  tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  let es = 0;
  while (1 << (es + 1) <= n) es++;
  const head = Buffer.alloc(12 + 16 * n);
  head.writeUInt32BE(flavor, 0);
  head.writeUInt16BE(n, 4);
  head.writeUInt16BE((1 << es) * 16, 6);
  head.writeUInt16BE(es, 8);
  head.writeUInt16BE(n * 16 - (1 << es) * 16, 10);
  const parts = [head];
  let off = head.length;
  tables.forEach((t, i) => {
    const r = 12 + i * 16;
    head.write(t.tag, r, "latin1");
    head.writeUInt32BE(t.sum, r + 4);
    head.writeUInt32BE(off, r + 8);
    head.writeUInt32BE(t.data.length, r + 12);
    const pad = (4 - (t.data.length % 4)) % 4;
    parts.push(t.data, Buffer.alloc(pad));
    off += t.data.length + pad;
  });
  return Buffer.concat(parts);
}
