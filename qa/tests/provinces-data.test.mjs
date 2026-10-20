import test from "node:test";
import assert from "node:assert/strict";
import { PROVINCES } from "../../be/lambda/src/data/provinces.js";
import { normalize } from "../../be/lambda/src/normalize.js";
import { searchProvinces } from "../../be/lambda/src/search.js";

const OFFICIAL = [
  "Hà Nội", "Hà Giang", "Cao Bằng", "Bắc Kạn", "Tuyên Quang", "Lào Cai", "Điện Biên", "Lai Châu",
  "Sơn La", "Yên Bái", "Hòa Bình", "Thái Nguyên", "Lạng Sơn", "Quảng Ninh", "Bắc Giang", "Phú Thọ",
  "Vĩnh Phúc", "Bắc Ninh", "Hải Dương", "Hải Phòng", "Hưng Yên", "Thái Bình", "Hà Nam", "Nam Định",
  "Ninh Bình", "Thanh Hóa", "Nghệ An", "Hà Tĩnh", "Quảng Bình", "Quảng Trị", "Thừa Thiên Huế",
  "Đà Nẵng", "Quảng Nam", "Quảng Ngãi", "Bình Định", "Phú Yên", "Khánh Hòa", "Ninh Thuận",
  "Bình Thuận", "Kon Tum", "Gia Lai", "Đắk Lắk", "Đắk Nông", "Lâm Đồng", "Bình Phước", "Tây Ninh",
  "Bình Dương", "Đồng Nai", "Bà Rịa", "Hồ Chí Minh", "Long An", "Tiền Giang", "Bến Tre", "Trà Vinh",
  "Vĩnh Long", "Đồng Tháp", "An Giang", "Kiên Giang", "Cần Thơ", "Hậu Giang", "Sóc Trăng", "Bạc Liêu",
  "Cà Mau",
];

test("[TC-001] dataset has exactly 63 entries", () => {
  assert.equal(OFFICIAL.length, 63, "test fixture itself must hold 63 names");
  assert.equal(PROVINCES.length, 63);
});

test("[TC-002] codes and names are unique and non-empty", () => {
  assert.equal(new Set(PROVINCES.map((p) => p.code)).size, 63, "codes must be unique");
  assert.equal(new Set(PROVINCES.map((p) => p.name)).size, 63, "names must be unique");
  assert.equal(new Set(PROVINCES.map((p) => normalize(p.name))).size, 63, "normalized names must be unique");
  for (const p of PROVINCES) {
    assert.equal(typeof p.code, "string");
    assert.equal(typeof p.name, "string");
    assert.ok(p.code.trim().length > 0, "empty code");
    assert.ok(p.name.trim().length > 0, "empty name");
  }
});

test("[TC-003] dataset matches the official list of 63 provinces/cities", () => {
  const keys = PROVINCES.map((p) => normalize(p.name));
  const used = new Set();
  for (const expected of OFFICIAL) {
    const idx = keys.findIndex((k, i) => !used.has(i) && k.includes(normalize(expected)));
    assert.ok(idx >= 0, `missing official province: ${expected}`);
    used.add(idx);
  }
  assert.equal(used.size, 63);
});

test("[TC-003] major cities are present: Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Hải Phòng, Cần Thơ", () => {
  const keys = PROVINCES.map((p) => normalize(p.name));
  for (const city of ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ"]) {
    assert.ok(keys.some((k) => k.includes(normalize(city))), `missing ${city}`);
  }
  assert.ok(PROVINCES.some((p) => p.name === "Đà Nẵng"), "accented display name must be kept");
});

test("[TC-004] dataset is sorted by code and frozen", () => {
  const codes = PROVINCES.map((p) => p.code);
  assert.deepEqual(codes, [...codes].sort());
  assert.ok(Object.isFrozen(PROVINCES), "array must be frozen");
  assert.ok(Object.isFrozen(PROVINCES[0]), "entries must be frozen");
});

test("[TC-005] normalize strips diacritics including stacked marks", () => {
  assert.equal(normalize("Thừa Thiên Huế"), "thua thien hue");
  assert.equal(normalize("Hà Nội"), "ha noi");
  assert.equal(normalize("Bạc Liêu"), "bac lieu");
});

test("[TC-006] normalize maps đ and Đ to d", () => {
  assert.equal(normalize("Đà Nẵng"), "da nang");
  assert.equal(normalize("Đồng Nai"), "dong nai");
  assert.equal(normalize("đ"), "d");
  assert.equal(normalize("Đ"), "d");
  assert.equal(normalize("Đắk Lắk"), "dak lak");
});

test("[TC-007] normalize is case-insensitive", () => {
  assert.equal(normalize("HÀ NỘI"), "ha noi");
  assert.equal(normalize("hà nội"), "ha noi");
  assert.equal(normalize("ĐÀ NẴNG"), "da nang");
  assert.equal(normalize("KON TUM"), normalize("kon tum"));
});

test("[TC-008] normalize trims and collapses whitespace", () => {
  assert.equal(normalize("  da   nang  "), "da nang");
  assert.equal(normalize("\tha \n noi\t"), "ha noi");
});

test("[TC-009] precomposed and decomposed forms normalize identically", () => {
  for (const name of ["Đà Nẵng", "Thừa Thiên Huế", "Đồng Nai", "Hà Nội"]) {
    const nfc = name.normalize("NFC");
    const nfd = name.normalize("NFD");
    assert.equal(normalize(nfc), normalize(nfd), `forms of ${name} differ`);
  }
  assert.equal(normalize("Đà Nẵng".normalize("NFD")), "da nang");
});

test("[TC-010] searchProvinces is a substring filter and does not mutate shared data", () => {
  assert.equal(searchProvinces(PROVINCES, undefined).length, 63);
  assert.equal(searchProvinces(PROVINCES, "").length, 63);
  const hue = searchProvinces(PROVINCES, "hue");
  assert.equal(hue.length, 1);
  assert.equal(hue[0].name, "Thừa Thiên Huế");
  const all = searchProvinces(PROVINCES, undefined);
  all.length = 0;
  all.push({ code: "xx", name: "junk" });
  assert.equal(PROVINCES.length, 63);
  assert.equal(searchProvinces(PROVINCES, undefined).length, 63);
  assert.equal(searchProvinces(PROVINCES, "da nang")[0].name, "Đà Nẵng");
});
