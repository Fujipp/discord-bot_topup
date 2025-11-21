// utils/icons.js
const fs = require("fs");
const path = require("path");

const ICONS_PATH = path.resolve(__dirname, "../config/icons.json");
let cache = null;
function load() {
  if (cache) return cache;
  try { cache = JSON.parse(fs.readFileSync(ICONS_PATH, "utf8")); }
  catch { cache = { emoji: {}, images: {}, defaults: {} }; }
  return cache;
}

// คืนเป็นแท็กที่ Discord ใช้ได้: <:name:id> หรือ <a:name:id>
function emojiTag(key) {
  const m = load().emoji?.[key];
  if (!m?.id || !m?.name) return null;
  return m.animated ? `<a:${m.name}:${m.id}>` : `<:${m.name}:${m.id}>`;
}

// ใช้ตอนกำหนด emoji ใน select/menu/button (ต้องเป็น object)
function emojiObj(key) {
  const m = load().emoji?.[key];
  if (!m?.id || !m?.name) return undefined;
  return { id: m.id, name: m.name, animated: !!m.animated };
}

// ภาพ URL
function img(key) { return load().images?.[key] || null; }

// ไอคอนค่าเริ่มต้น (author/footer)
function defaults() { return load().defaults || {}; }

module.exports = { emojiTag, emojiObj, img, defaults };
