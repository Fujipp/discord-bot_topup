// update/home_update.js
const fs = require("fs");
const path = require("path");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const ConfigManager = require("../utils/configManager");

function getAllowedUserIds() {
  try {
    // อ่านจาก ConfigManager ก่อน
    const configData = ConfigManager.get("allowedUserIds");
    if (configData) {
      return Array.isArray(configData) ? configData : [];
    }
    
    // Fallback ไปยัง alias key
    const aliasData = ConfigManager.get("ไอดีผู้ใช้งานที่ใช้คำสั่งได้");
    if (aliasData) {
      return Array.isArray(aliasData) ? aliasData : [];
    }
    
    // Fallback ไปยัง config.json (เพื่อความเข้ากันได้เดิม)
    const cfg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config.json"), "utf8"));
    if (Array.isArray(cfg?.allowedUserIds)) return cfg.allowedUserIds;
    if (Array.isArray(cfg?.["ไอดีผู้ใช้งานที่ใช้คำสั่งได้"])) return cfg["ไอดีผู้ใช้งานที่ใช้คำสั่งได้"];
    return [];
  } catch { 
    return []; 
  }
}

function getPanelData() {
  const serverPath = path.resolve(__dirname, "./logdata.json");
  let data = {};
  try { data = JSON.parse(fs.readFileSync(serverPath, "utf8")); } catch {}
  return {
    price1:   data?.["ราคาบูสต์หนึ่งเดือน"] || "รอเพิ่ม",
    price3:   data?.["ราคาบูสต์สามเดือน"]  || "รอเพิ่ม",
    chBoost:  data?.["ไอดีช่องส่งประวัติการบูสต์"] || "รอเพิ่ม",
    chOrders: data?.["ไอดีช่องส่งออเดอร์แอดมิน"]   || "รอเพิ่ม",
  };
}

module.exports = {
  name: "interactionCreate",
  async execute(client, interaction) {
    try {
      // จับเฉพาะ select menu refresh เท่านั้น
      const isRefresh = interaction.isStringSelectMenu?.() && interaction.customId === "refresh" && interaction.values?.[0] === "setup";
      if (!isRefresh) return;

      const allowed = getAllowedUserIds();
      if (allowed.length && !allowed.includes(interaction.user.id)) {
        return interaction.update({ content: "``❌ เอ้ะ! คำสั่งสำหรับผู้ที่มีสิทธิ์เท่านั้น ``", components: [], flags: MessageFlags.Ephemeral });
      }

      const { price1, price3, chBoost, chOrders } = getPanelData();

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("``⚙️`` ตั้งค่าระบบตั้งค่าหลังบ้าน")
        .addFields(
          { name: `\`\`💰\`\` ราคาบูสต์หนึ่งเดือน \`\` ${price1} \`\``, value: "_ _" },
          { name: `\`\`💰\`\` ราคาบูสต์สามเดือน \`\` ${price3} \`\``, value: "_ _" },
          { name: `\`\`🆔\`\` ไอดีช่องส่งประวัติการบูสต์ \`\` ${chBoost} \`\``, value: "_ _" },
          { name: `\`\`🆔\`\` ไอดีช่องส่งออเดอร์แอดมิน \`\` ${chOrders} \`\``, value: "_ _" },
        )
        .setImage("https://img2.pic.in.th/pic/8617984945af94a5f32129eb7522f39a.png");

      const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("refresh")
          .setPlaceholder("🔄 รีเฟชรหน้าต่าง")
          .addOptions([{ label: "รีเฟชรดูการอัปเดต", emoji: "🔄", value: "setup" }])
      );

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("setting_topup").setLabel("🏛️ ตั้งค่า API ธนาคาร").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("setting_topup_wallet").setLabel("🧧 ตั้งค่าบัญชีวอเลต").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("setting_channel").setLabel("🆔 ตั้งค่าไอดีช่อง (ทั่วไป)").setStyle(ButtonStyle.Success),
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("setting_channel_bank").setLabel("🏦 ตั้งค่าไอดีช่อง/ยศ (ธนาคาร)").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("price_boot").setLabel("💰 ตั้งราคาสินค้า").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("setting_payment_embed").setLabel("🧱 ตั้งค่า Payment Embed").setStyle(ButtonStyle.Secondary),
      );

      await interaction.update({
        embeds: [embed],
        components: [selectRow, row1, row2],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("home_update error", error);
    }
  }
};
