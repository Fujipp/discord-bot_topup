// commands/payment.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs"); const path = require("path");

const EMBED_TITLE = `"'                     ₊　　　　⁺　　　．　　　₊　   ⁺　　　\n` +
  `**．⠀⠀︵︵ 　__เติมเงิน__, อัตโนมัติ!**\n\n` +
  `**            pay money　 ( <a:CatToken:1407473158101143592> )   thank you **`;

const IMAGE_URL = "https://cdn.discordapp.com/attachments/1409826406048989275/1420630396244332637/9467541a253543a32d1a405b3d784cfe.gif?ex=68d618a8&is=68d4c728&hm=9052d1ad77012d07fa56394a6ed312b8ed4f31b1e32464d190771ff3174a8c35&fbclid=PAVERFWANBptVleHRuA2FlbQIxMAABp8yzurcRUZ2Yt1D2E58MLPTRSPscG1l6bbV8kEVv1CNGIF8uU_h55JEMkI15_aem_N_zdK5ziXiZ6aI_UkZyb3Q";

function readColor() {
  try { return require("../config.json")?.EMBED_COLOR ?? 3618621; } catch { return 3618621; }
}
function readAllowed() {
  try { return require("../config.json")?.allowedUserIds ?? []; } catch { return []; }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("payment")
    .setDescription("ส่ง embed สำหรับจ่ายเงินไปที่ห้อง (ไม่ใส่ channelId = ส่งในห้องนี้)")
    .addStringOption(o => o.setName("channelid").setDescription("ID ห้องปลายทาง").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
  async execute(interaction, client) {
    const allowed = readAllowed();
    if (allowed.length && !allowed.includes(interaction.user.id)) {
      return interaction.reply({ content: "❌ คำสั่งนี้จำกัดผู้ใช้", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const channelId = interaction.options.getString("channelid") || interaction.channelId;
    const channel = client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased?.()) {
      return interaction.editReply("❌ ไม่พบห้องปลายทางหรือส่งข้อความไม่ได้");
    }

    const embed = new EmbedBuilder()
      .setColor(readColor())
      .setTitle(EMBED_TITLE)
      .setImage(IMAGE_URL)
      .setFooter({ text: "Claire Paymoney" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy_topup")              // ไปต่อ menu_topup.js / wallet.js
        .setLabel("เติมเงิน")
        .setEmoji("<:Ts_22_discord_4plus:1397892632960831548>")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("chack_topup")            // ไปต่อ chack_topup.js
        .setLabel("เช็คยอดเงิน")
        .setEmoji("<a:Ts_29_discord_star8:1399003269216469133>")
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply(`✅ ส่ง embed ไปที่ <#${channelId}> แล้ว`);
  }
};
