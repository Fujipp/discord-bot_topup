// commands/setup.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

function getPanelData() {
  const serverPath = path.resolve(__dirname, "../update/logdata.json");
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
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("เปิดหน้าตั้งค่าระบบหลังบ้าน")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    // กัน timeout 3 วิ
    await interaction.deferReply({ ephemeral: true });

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

    await interaction.editReply({
      embeds: [embed],
      components: [selectRow, row1, row2],
      flags: MessageFlags.Ephemeral,
    });
  }
};
