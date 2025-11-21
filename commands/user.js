// commands/user.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { setBalance, addBalance, removeBalance, getBalance } = require("../bank/base");
const fs = require("fs");
const path = require("path");

// ===== utils for notify =====
function readLog() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, "../update/logdata.json"), "utf8")); }
  catch { return {}; }
}
const COLOR = 3618621;
const LINE_SUCCESS = "https://www.animatedimages.org/data/media/562/animated-line-image-0312.gif";
function tsDiscord(date = new Date()) {
  const unix = Math.floor(date.getTime() / 1000);
  return `<t:${unix}:f>`;
}
async function notifyCreditChange(guild, { user, amount, total, method, title }) {
  const cfg = readLog();
  const notifyId = String(cfg?.["ไอดีช่องแจ้งเตือนเติมเงิน"] || "");
  if (!notifyId) return;
  const ch = guild.channels.cache.get(notifyId);
  if (!(ch?.isTextBased?.() || ch?.send)) return;

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("<:Ts_22_discord_1ture:1397892606209429584> เติมเงินสำเร็จ (ADMIN)") // เช่น "✅ แจ้งเตือนเติมเงินสำเร็จ (Admin)"
    .setDescription("\n")
    .setThumbnail(user.displayAvatarURL())
    .setImage(LINE_SUCCESS)
    .setFields(
      {
        name: "<:Ts_9_discord_member:1397694189575344298> : คนทำรายการ",
        value: `\`\`\`${user.username}\`\`\``,
        inline: false,
      },
      {
        name: "<:Ts_14_discord_pointg:1397694229333016647> : จำนวณเงินที่เติม",
        value: `\`\`\`${Number(amount || 0).toFixed(2)}\`\`\``,
        inline: false,
      },
      {
        name: "<:Ts_19_discord_coin:1397694253676630066> : จำนวณเงินทั้งหมด",
        value: `\`\`\`${Number(total || 0).toFixed(2)}\`\`\``,
        inline: false,
      },
      {
        name: "<:Ts_0_discord_bank:1398972893416914965> : ช่องทางการเติม",
        value: "```Admin```",
        inline: false,
      },
      {
        name: "<:Ts_10_discord_Clock:1397694191429095675> : วันที่และเวลาทำรายการ",
        value: tsDiscord(), // ไม่มี backticks เพื่อให้ Discord render เวลา
        inline: false,
      },
    );

  await ch.send({
    embeds: [embed],
    // กัน ping โดยไม่ได้ตั้งใจ (เราแสดงเป็น code block อยู่แล้ว)
    // allowedMentions: { users: [] },
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("จัดการเครดิตผู้ใช้ (JSON)")
    .addSubcommand(s => s.setName("add").setDescription("เพิ่มเครดิต")
      .addUserOption(o => o.setName("user").setDescription("ผู้ใช้").setRequired(true))
      .addNumberOption(o => o.setName("amount").setDescription("จำนวนเงิน").setRequired(true)))
    .addSubcommand(s => s.setName("update").setDescription("อัปเดตยอดเป็นจำนวนใหม่")
      .addUserOption(o => o.setName("user").setDescription("ผู้ใช้").setRequired(true))
      .addNumberOption(o => o.setName("amount").setDescription("จำนวนเงิน").setRequired(true)))
    .addSubcommand(s => s.setName("delete").setDescription("ลบข้อมูลผู้ใช้")
      .addUserOption(o => o.setName("user").setDescription("ผู้ใช้").setRequired(true)))
    .addSubcommand(s => s.setName("get").setDescription("ดูยอด")
      .addUserOption(o => o.setName("user").setDescription("ผู้ใช้").setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser("user");
    const amount = interaction.options.getNumber("amount");

    await interaction.deferReply({ ephemeral: true });

    if (sub === "add") {
      const next = addBalance(user.id, amount);
      // แจ้งเตือนห้อง + method=Admin
      await notifyCreditChange(interaction.guild, {
        user, amount, total: next, method: "Admin",
        title: "✅ แจ้งเตือนเติมเงินสำเร็จ (Admin)"
      });
      return interaction.editReply(`✅ เพิ่มให้ <@${user.id}> → ${amount.toFixed(2)} THB | คงเหลือ ${Number(next).toFixed(2)} THB`);
    }

    if (sub === "update") {
      const next = setBalance(user.id, amount);
      // แจ้งเตือนห้อง + method=Admin
      await notifyCreditChange(interaction.guild, {
        user, amount, total: next, method: "Admin",
        title: "✅ แจ้งเตือนอัปเดตยอดสำเร็จ (Admin)"
      });
      return interaction.editReply(`✏️ ตั้งยอดของ <@${user.id}> เป็น ${Number(next).toFixed(2)} THB`);
    }

    if (sub === "delete") {
      const ok = removeBalance(user.id);
      return interaction.editReply(ok ? `🗑️ ลบข้อมูลของ <@${user.id}> แล้ว` : "❌ ไม่พบข้อมูล");
    }

    if (sub === "get") {
      const cur = getBalance(user.id);
      return interaction.editReply(`👛 <@${user.id}> คงเหลือ ${Number(cur || 0).toFixed(2)} THB`);
    }
  }
};
