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
const TOPUP_HISTORY_PATH = path.resolve(process.cwd(), "data/topup_history.json");

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
function addBalance(userId, amount) { const cur = toNum(balances[userId]); const next = Math.round((cur + toNum(amount)) * 100) / 100; balances[userId] = next.toFixed(2); saveBalances(); return balances[userId]; }
function deductBalance(userId, amount) { const cur = toNum(balances[userId]); const dec = toNum(amount); if (cur >= dec) { const next = Math.round((cur - dec) * 100) / 100; balances[userId] = next.toFixed(2); saveBalances(); return true; } return false; }
function getBalance(userId) { return typeof balances[userId] === "string" ? balances[userId] : "0.00"; }
function removeBalance(userId) { if (userId in balances) { delete balances[userId]; saveBalances(); return true; } return false; }

// ===== Topup History (2-layer protection) =====
let topupHistory = {};

function ensureTopupHistoryFile() {
  const dir = path.dirname(TOPUP_HISTORY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(TOPUP_HISTORY_PATH)) fs.writeFileSync(TOPUP_HISTORY_PATH, JSON.stringify({}, null, 2));
}

function loadTopupHistory() {
  try { ensureTopupHistoryFile(); topupHistory = JSON.parse(fs.readFileSync(TOPUP_HISTORY_PATH, "utf8") || "{}") || {}; }
  catch { topupHistory = {}; }
}

function saveTopupHistory() {
  try { ensureTopupHistoryFile(); fs.writeFileSync(TOPUP_HISTORY_PATH, JSON.stringify(topupHistory, null, 2)); }
  catch (e) { console.error("saveTopupHistory error:", e); }
}

/**
 * บันทึกประวัติเติมเงิน
 * @param {string} userId - Discord user ID
 * @param {number} amount - จำนวนเงินที่เติม
 * @param {string} method - ช่องทางเติมเงิน (e.g., "TrueMoney", "PromptPay")
 */
function recordTopup(userId, amount, method = "Unknown") {
  if (!topupHistory[userId]) {
    topupHistory[userId] = { count: 0, totalAmount: 0, history: [] };
  }
  topupHistory[userId].count += 1;
  topupHistory[userId].totalAmount += toNum(amount);
  topupHistory[userId].history.push({
    amount: toNum(amount),
    method,
    timestamp: new Date().toISOString(),
  });
  // เก็บแค่ 50 รายการล่าสุด
  if (topupHistory[userId].history.length > 50) {
    topupHistory[userId].history = topupHistory[userId].history.slice(-50);
  }
  saveTopupHistory();
}

/**
 * ตรวจสอบว่าผู้ใช้เคยเติมเงินหรือยัง (2-layer protection)
 * @param {string} userId - Discord user ID
 * @returns {boolean} - true ถ้าเคยเติมเงิน
 */
function hasTopupHistory(userId) {
  return topupHistory[userId]?.count > 0;
}

/**
 * ดึงข้อมูลประวัติเติมเงินของผู้ใช้
 * @param {string} userId - Discord user ID
 * @returns {object|null} - ข้อมูลประวัติหรือ null
 */
function getTopupHistory(userId) {
  return topupHistory[userId] || null;
}

loadBalances();
loadTopupHistory();

module.exports = {
  loadBalances, saveBalances, setBalance, addBalance, deductBalance, getBalance, removeBalance,
  recordTopup, hasTopupHistory, getTopupHistory,
};
