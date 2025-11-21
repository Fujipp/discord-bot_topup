// bank/base.js
const fs = require("fs");
const path = require("path");

function readCfg() {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "config.json"), "utf8")); }
  catch { return {}; }
}
const CFG = readCfg();
const CUSTOM_DB = CFG?.DATA_USERS && String(CFG.DATA_USERS).trim();
const DB_PATH = path.resolve(process.cwd(), CUSTOM_DB || "data/balances.json");

let balances = {};
function ensureFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
}
function loadBalances() {
  try { ensureFile(); balances = JSON.parse(fs.readFileSync(DB_PATH, "utf8") || "{}") || {}; }
  catch { balances = {}; }
}
function saveBalances() {
  try { ensureFile(); fs.writeFileSync(DB_PATH, JSON.stringify(balances, null, 2)); }
  catch (e) { console.error("saveBalances error:", e); }
}
const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function setBalance(userId, amount) { balances[userId] = toNum(amount).toFixed(2); saveBalances(); return balances[userId]; }
function addBalance(userId, amount)  { const cur = toNum(balances[userId]); const next = Math.round((cur + toNum(amount))*100)/100; balances[userId] = next.toFixed(2); saveBalances(); return balances[userId]; }
function deductBalance(userId, amount){ const cur = toNum(balances[userId]); const dec = toNum(amount); if (cur >= dec) { const next = Math.round((cur - dec)*100)/100; balances[userId] = next.toFixed(2); saveBalances(); return true; } return false; }
function getBalance(userId)          { return typeof balances[userId] === "string" ? balances[userId] : "0.00"; }
function removeBalance(userId)       { if (userId in balances) { delete balances[userId]; saveBalances(); return true; } return false; }

loadBalances();
module.exports = { loadBalances, saveBalances, setBalance, addBalance, deductBalance, getBalance, removeBalance };
