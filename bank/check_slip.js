// bank/check_slip.js
const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { addBalance } = require("./base");

// ===== Utilities =====
function readLog() {
  try {
    return JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../update/logdata.json"), "utf8")
    );
  } catch {
    return {};
  }
}

const SLIP_ERRORS = {
  1005: "อัปโหลดได้เฉพาะ .jpg .jpeg .png",
  1006: "รูปภาพไม่ถูกต้อง",
  1007: "ไม่มี QR ในรูป — ลองครอปให้เหลือเฉพาะ QR",
  1008: "QR ไม่ใช่สำหรับตรวจสอบการชำระเงิน",
  1009: "ระบบธนาคารขัดข้องชั่วคราว",
  1010: "สลิปจากธนาคาร — รอตรวจสอบหลังการโอน",
  1011: "QR หมดอายุ / ไม่มีรายการ",
  1012: "สลิปซ้ำ — เคยส่งมาแล้ว",
  1013: "ยอดที่ส่งไม่ตรงกับยอดสลิป",
  1014: "บัญชีผู้รับไม่ตรงกับบัญชีหลัก",
};

function tsDiscord(date = new Date()) {
  const unix = Math.floor(date.getTime() / 1000);
  return `<t:${unix}:f>`;
}

// ===== SlipOK Callers =====
async function verifyViaUrl(branchId, apiKey, imageUrl) {
  const endpoint = `https://api.slipok.com/api/line/apikey/${branchId}`;
  const form = new FormData();
  form.append("url", imageUrl);
  form.append("log", "true");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "x-authorization": String(apiKey || "") },
    body: form,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { ok: res.ok, status: res.status, body: data || {} };
}

async function verifyViaFiles(branchId, apiKey, imageUrl) {
  const endpoint = `https://api.slipok.com/api/line/apikey/${branchId}`;
  const img = await fetch(imageUrl);
  const buf = await img.arrayBuffer();
  const file = new File(
    [new Uint8Array(buf)],
    "slip.jpg",
    { type: img.headers.get("content-type") || "image/jpeg" }
  );

  const form = new FormData();
  form.append("files", file);
  form.append("log", "true");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "x-authorization": String(apiKey || "") },
    body: form,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { ok: res.ok, status: res.status, body: data || {} };
}

// ===== Embeds (Templates) =====
const COLOR = 3618621;

// success
function buildSuccessEmbed({ username, avatar, amount, newBalance, method, timestamp }) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("<:Ts_22_discord_1ture:1397892606209429584> เติมเงินสำเร็จ")
    .setDescription("\n")
    .setThumbnail(avatar)
    .setImage("https://www.animatedimages.org/data/media/562/animated-line-image-0312.gif")
    .setFields(
      {
        name: "<:Ts_9_discord_member:1397694189575344298> : คนทำรายการ",
        value: `\`\`\`${username}\`\`\``,
        inline: false,
      },
      {
        name: "<:Ts_14_discord_pointg:1397694229333016647> : จำนวณเงินที่เติม",
        value: `\`\`\`${amount.toFixed(2)}\`\`\``,
        inline: false,
      },
      {
        name: "<:Ts_19_discord_coin:1397694253676630066> : จำนวณเงินทั้งหมด",
        value: `\`\`\`${newBalance.toFixed ? newBalance.toFixed(2) : Number(newBalance || 0).toFixed(2)}\`\`\``,
        inline: false,
      },
      {
        name: "<:Ts_0_discord_bank:1398972893416914965> : ช่องทางการเติม",
        value: `\`\`\`${method}\`\`\``,
        inline: false,
      },
      {
        name: "<:Ts_10_discord_Clock:1397694191429095675> : วันที่และเวลาทำรายการ", value: `${timestamp}`, inline: false },
    );
}

// fail (อ่านง่าย ไม่โชว์ error code)
function buildFailEmbed({ avatar, reason, timestamp }) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("<:Ts_22_discord_1false:1397892604040974479> เติมเงินไม่สำเร็จ")
    .setThumbnail(avatar)
    .setImage("https://www.animatedimages.org/data/media/562/animated-line-image-0104.gif")
    .setFields(
      {
        name: "<:Ts_14_discord_pointr:1397694238132535367> : DECRIPTION",
        value: `\`\`\`${reason}\`\`\``,
        inline: false,
      },
      {
        name: "<:Ts_10_discord_outoftime:1397694356563038248> : วันที่และเวลาทำรายการ", value: `${timestamp}`, inline: false },
    );
}

// fatal
function buildFatalEmbed({ avatar, reason }) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("<:Ts_12_discord_abane:1397694204863315998> เกิดข้อผิดพลาด")
    .setDescription(`${reason}`)
    .setThumbnail(avatar)
    .setImage("https://www.animatedimages.org/data/media/562/animated-line-image-0538.gif");
}

// loading
function buildLoadingEmbed({ avatar, text }) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("<a:Ts_22_discord_2loading:1397892627839324160> กำลังประมวลผล")
    .setDescription(`**${text || "กำลังตรวจสอบ Slip..."}**`)
    .setThumbnail(avatar);
}

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    try {
      if (message.author.bot || !message.attachments?.size) return;

      const cfg = readLog();
      const channelCheckId = String(cfg?.["ไอดีช่องเช็คสลิป"] || "");
      if (!channelCheckId || String(message.channel.id) !== channelCheckId) return;

      // sanitize SLIPOK_BRANCH_ID (รองรับกรณีพิมพ์ลิงก์เต็ม)
      let branchId = String(cfg?.SLIPOK_BRANCH_ID || "").trim().replace(/\/+$/, "");
      if (/^https?:\/\//i.test(branchId)) branchId = branchId.split("/").pop();
      const apiKey = String(cfg?.API_SLIPOK_KEY || "").trim();

      const avatar = message.author.displayAvatarURL();
      const username = message.author.username;

      if (!branchId) {
        await message.reply({
          embeds: [buildFatalEmbed({
            avatar,
            reason: "ยังไม่ได้ตั้งค่า SLIPOK_BRANCH_ID (ใส่เฉพาะ \"รหัสท้ายลิงก์\" ไม่ใช่ลิงก์เต็ม)",
          })],
        });
        return;
      }

      for (const att of message.attachments.values()) {
        const imageUrl = att.url;

        // show loading
        const loadingMsg = await message.reply({
          embeds: [buildLoadingEmbed({ avatar, text: "กำลังตรวจสอบ Slip / กำลังเช็ค..." })],
        });

        try {
          // ยิงแบบ URL ก่อน
          let { ok, status, body } = await verifyViaUrl(branchId, apiKey, imageUrl);

          // ถ้า 404/Not Found หรือไม่ ok → ลองแบบ files
          if (!ok && (status === 404 || (body && /not\s*found/i.test(String(body?.message || ""))))) {
            ({ ok, status, body } = await verifyViaFiles(branchId, apiKey, imageUrl));
          }

          if (ok && body?.success) {
            const amount = Number(body?.data?.amount || 0);
            if (!Number.isFinite(amount) || amount <= 0) {
              await loadingMsg.edit({
                embeds: [
                  buildFailEmbed({
                    avatar,
                    reason: "ตรวจสลิปผ่าน แต่ไม่พบยอดเงินในข้อมูล",
                    timestamp: tsDiscord(),
                  }),
                ],
              });
              continue;
            }

            const newBalance = addBalance(message.author.id, amount);

            await loadingMsg.edit({
              embeds: [
                buildSuccessEmbed({
                  username,
                  avatar,
                  amount,
                  newBalance,
                  method: "QR (SlipOK)",
                  timestamp: tsDiscord(),
                }),
              ],
            });

            // แจกยศ (ถ้าตั้งค่า)
            const roleId = String(cfg?.["ไอดียศได้รับเมื่อเติมเงิน"] || "");
            if (roleId) {
              const role = message.guild.roles.cache.get(roleId);
              if (role) {
                try { await message.member.roles.add(role); }
                catch (e) { console.error("add role error:", e); }
              }
            }

            const COLOR = 3618621;
            const LINE_SUCCESS = "https://www.animatedimages.org/data/media/562/animated-line-image-0312.gif";


            // แจ้งเตือนช่อง notify (ถ้าตั้ง)
            const notifyId = String(cfg?.["ไอดีช่องแจ้งเตือนเติมเงิน"] || "");
            if (notifyId) {
            const ch = message.guild.channels.cache.get(notifyId);
            if (ch?.isTextBased?.() || ch?.send) {
                await ch.send({
                embeds: [
                    new EmbedBuilder()
                    .setColor(COLOR)
                    .setTitle("<:Ts_22_discord_1ture:1397892606209429584> เติมเงินสำเร็จ")
                    .setDescription("\n")
                    .setThumbnail(avatar)
                    .setImage("https://www.animatedimages.org/data/media/562/animated-line-image-0312.gif")
                    .setFields(
                        { name: "<:Ts_9_discord_member:1397694189575344298> : คนทำรายการ", value: `\`\`\`${message.author.username}\`\`\``, inline: false },
                        { name: "<:Ts_14_discord_pointg:1397694229333016647> : จำนวณเงินที่เติม", value: `\`\`\`${amount.toFixed(2)}\`\`\``, inline: false },
                        { name: "<:Ts_19_discord_coin:1397694253676630066> : จำนวณเงินทั้งหมด", value: `\`\`\`${Number(newBalance || 0).toFixed(2)}\`\`\``, inline: false },
                        { name: "<:Ts_0_discord_bank:1398972893416914965> : ช่องทางการเติม", value: `\`\`\`QR (SlipOK)\`\`\``, inline: false },
                        { name: "<:Ts_10_discord_Clock:1397694191429095675> : วันที่และเวลาทำรายการ", value: tsDiscord(), inline: false },
                    )
                ],
                });
              }
            }
          } else {
            // สร้างข้อความอ่านง่าย ไม่แสดง code
            const code = Number(body?.code ?? status);
            const msgFromApi = String(body?.message || "").trim();
            const human = SLIP_ERRORS[code] || (msgFromApi ? msgFromApi : "ไม่สามารถตรวจสอบสลิปได้ในขณะนี้");

            await loadingMsg.edit({
              embeds: [
                buildFailEmbed({
                  avatar,
                  reason: human,
                  timestamp: tsDiscord(),
                }),
              ],
            });
          }
        } catch (err) {
          console.error("SlipOK verify fatal:", err);
          await loadingMsg.edit({
            embeds: [
              buildFatalEmbed({
                avatar,
                reason: "เชื่อมต่อบริการตรวจสลิปล้มเหลว กรุณาลองใหม่หรือตรวจสอบการตั้งค่า (SLIPOK_BRANCH_ID / API_SLIPOK_KEY)",
              }),
            ],
          });
        }
      }

      client.setMaxListeners(15);
    } catch (outer) {
      console.error("check_slip outer error:", outer);
    }
  },
};
