// bank/wallet.js (patched → handler เดียว)
const fs = require("fs");
const path = require("path");
const { addBalance } = require("./base");
const { META_API } = require("../api/truemoney");
const {
  TextInputBuilder, ActionRowBuilder, ModalBuilder, TextInputStyle,
  EmbedBuilder, MessageFlags
} = require("discord.js");

function readLog() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, "../update/logdata.json"), "utf8")); }
  catch { return {}; }
}

const COLOR = 3618621;
const GIF_LOADING = "https://www.animatedimages.org/data/media/562/animated-line-image-0124.gif";
const GIF_SUCCESS = "https://www.animatedimages.org/data/media/562/animated-line-image-0312.gif";
const GIF_FAIL    = "https://www.animatedimages.org/data/media/562/animated-line-image-0104.gif";
const GIF_FATAL   = "https://www.animatedimages.org/data/media/562/animated-line-image-0538.gif";

function tsDiscord(date = new Date()) {
  const unix = Math.floor(date.getTime() / 1000);
  return `<t:${unix}:f>`;
}

function openWalletModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("wallet_modal")
    .setTitle("เติมเงินด้วยซองอั่งเปา")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("codeInput")
          .setLabel("🧧 กรอกลิงก์ซองอั่งเปา")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("https://gift.truemoney.com/campaign/?v=xxxxxxxxxxxxxxx")
          .setRequired(true)
      )
    );
  return interaction.showModal(modal);
}

/* ===== Embed templates (UI) ===== */
const buildLoading = (avatar, text = "กำลังตรวจสอบซองอั่งเปา...") =>
  new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("<a:Ts_22_discord_2loading:1397892627839324160> กำลังประมวลผล")
    .setDescription(`**${text}**`)
    .setThumbnail(avatar)
    .setImage(GIF_LOADING);

const buildSuccess = ({ username, avatar, amount, after, method, timestamp }) =>
  new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("<:Ts_22_discord_1ture:1397892606209429584> เติมเงินสำเร็จ")
    .setDescription("\n")
    .setThumbnail(avatar)
    .setImage(GIF_SUCCESS)
    .setFields(
      { name: "<:Ts_9_discord_member:1397694189575344298> : คนทำรายการ", value: `\`\`\`${username}\`\`\``, inline: false },
      { name: "<:Ts_14_discord_pointg:1397694229333016647> : จำนวณเงินที่เติม", value: `\`\`\`${amount.toFixed(2)}\`\`\``, inline: false },
      { name: "<:Ts_19_discord_coin:1397694253676630066> : จำนวณเงินทั้งหมด", value: `\`\`\`${Number(after || 0).toFixed(2)}\`\`\``, inline: false },
      { name: "<:Ts_0_discord_bank:1398972893416914965> : ช่องทางการเติม", value: `\`\`\`${method}\`\`\``, inline: false },
      { name: "<:Ts_10_discord_Clock:1397694191429095675> : วันที่และเวลาทำรายการ", value: `${timestamp}`, inline: false },
    );

const buildFail = ({ avatar, reason, timestamp }) =>
  new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("<:Ts_22_discord_1false:1397892604040974479> เติมเงินไม่สำเร็จ")
    .setThumbnail(avatar)
    .setImage(GIF_FAIL)
    .setFields(
      { name: "<:Ts_14_discord_pointr:1397694238132535367> : DECRIPTION", value: `\`\`\`${reason}\`\`\``, inline: false },
      { name: "<:Ts_10_discord_outoftime:1397694356563038248> : วันที่และเวลาทำรายการ", value: `${timestamp}`, inline: false }
    );

const buildFatal = ({ avatar, reason }) =>
  new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("<:Ts_12_discord_abane:1397694204863315998> เกิดข้อผิดพลาด")
    .setDescription(reason)
    .setThumbnail(avatar)
    .setImage(GIF_FATAL);

module.exports = {
  name: "interactionCreate",
  async execute(_client, interaction) {
    /* Trigger เปิด modal */
    try {
      const isClosed = !!readLog()?.เมนูระบบใช้งานธนาคาร; // true = ปิดธนาคาร → เปิด Wallet ตรงๆ
      if (interaction.isButton() && interaction.customId === "buy_topup" && isClosed) {
        return openWalletModal(interaction);
      }
      if (interaction.isStringSelectMenu() && interaction.customId === "teram_topup") {
        const choice = interaction.values?.[0];
        if (choice === "เติมวอเลต") return openWalletModal(interaction);
      }
    } catch (e) { console.error("wallet trigger error:", e); }

    /* Modal submit → โหลด → ยิง API → แสดงผล */
    if (!(interaction.isModalSubmit() && interaction.customId === "wallet_modal")) return;

    const failReply = async (embed) => {
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [embed] });
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    };

    try {
      const avatar = interaction.user.displayAvatarURL();
      const username = interaction.user.username;

      // ส่ง “กำลังประมวลผล” ก่อน (Ephemeral)
      await interaction.reply({
        embeds: [buildLoading(avatar, "กำลังตรวจสอบซองอั่งเปา...")],
        flags: MessageFlags.Ephemeral,
      });

      const url = interaction.fields.getTextInputValue("codeInput").trim();
      if (!/^https:\/\/gift\.truemoney\.com\/campaign\/\?v=/.test(url)) {
        return failReply(buildFail({ avatar, reason: "กรุณากรอกลิงก์ซองอั่งเปาให้ถูกต้อง (ต้องขึ้นต้นด้วย https://gift.truemoney.com/campaign/?v= )", timestamp: tsDiscord() }));
      }

      const s = readLog();
      const phone = String(s?.เบอร์รับเงินวอเลท || "").replace(/\D/g, "");
      if (phone.length !== 10) {
        return failReply(buildFatal({ avatar, reason: "ยังไม่ได้ตั้งค่าเบอร์รับเงิน TrueMoney Wallet (ต้องมี 10 หลัก)" }));
      }

      const res = await META_API(url, phone);

      // แสดงข้อความสำหรับผู้ใช้เท่านั้น (ไม่โชว์รายละเอียดหลังบ้าน)
      if (!res.ok) {
        // map เหตุผลให้อ่านง่าย
        let reason = "ไม่สามารถแลกซองอั่งเปาได้ในขณะนี้ กรุณาตรวจสอบว่าลิงก์ถูกต้อง ซองยังไม่ถูกใช้ และยังไม่หมดอายุ";
        const msg = String(res?.error?.message || "").toLowerCase();
        if (msg.includes("expired")) reason = "ซองอั่งเปาหมดอายุแล้ว";
        else if (msg.includes("used") || msg.includes("redeemed")) reason = "ซองอั่งเปานี้ถูกใช้ไปแล้ว";
        else if (msg.includes("invalid")) reason = "ลิงก์ซองอั่งเปาไม่ถูกต้อง";
        else if (msg.includes("quota")) reason = "ซองอั่งเปาเกินโควต้าหรือมีปัญหาการใช้งาน";
        else if (msg.includes("insufficient")) reason = "ยอดในซองไม่เพียงพอ";
        else if (msg.includes("maintenance")) reason = "ระบบกำลังปิดปรับปรุง ชั่วคราว";

        return interaction.editReply({
          embeds: [buildFail({ avatar, reason, timestamp: tsDiscord() })],
          components: [],
        });
      }

      const payload = res.data || {};
      const amount = Number(payload.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        return interaction.editReply({
          embeds: [buildFail({ avatar, reason: "ตอบกลับไม่พบจำนวนเงินที่เติม", timestamp: tsDiscord() })],
          components: [],
        });
      }

      const after = addBalance(interaction.user.id, amount);

      // แสดงผลสำเร็จ (Ephemeral)
      const successEmbed = buildSuccess({
        username, avatar, amount, after,
        method: "Wallet (TrueMoney)",
        timestamp: tsDiscord(),
      });

      await interaction.editReply({ embeds: [successEmbed], components: [] });

      // แจ้งห้อง notify (ถ้าตั้ง)
      const notifyId = s?.ไอดีช่องแจ้งเตือนเติมเงิน || "";
      if (notifyId) {
        const ch = interaction.guild.channels.cache.get(String(notifyId));
        if (ch?.isTextBased?.() || ch?.send) {
          await ch.send({
            embeds: [
              buildSuccess({
                username, avatar, amount, after,
                method: "Wallet (TrueMoney)",
                timestamp: tsDiscord(),
              }).setTitle("<:Ts_22_discord_1ture:1397892606209429584> เติมเงินสำเร็จ")
            ],
            // optional: กัน ping
            // allowedMentions: { users: [] },
          });
        }
      }

    } catch (e) {
      console.error("wallet handler error:", e);
      return failReply(buildFatal({ avatar: interaction.user.displayAvatarURL(), reason: "เกิดข้อผิดพลาดไม่คาดคิด กรุณาลองใหม่อีกครั้ง" }));
    }
  }
};
