// commands/payment.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs"); const path = require("path");
const { getGroupInfo, getGroupFunds, getGroupIcon, getConfig, getGroupRevenueSummary } = require("../api/roblox");

/**
 * ดึงข้อมูล Roblox Group ทั้งหมด (ชื่อกลุ่ม, owner, memberCount, Robux balance, icon, revenue)
 */
async function fetchRobloxGroupData() {
  try {
    const [groupResult, fundsResult, iconResult, revenueResult] = await Promise.all([
      getGroupInfo(),
      getGroupFunds(),
      getGroupIcon(),
      getGroupRevenueSummary(),
    ]);

    if (!groupResult.ok) {
      console.log('[Roblox] Failed to fetch group info:', groupResult.error?.message);
      return null;
    }

    return {
      groupId: getConfig().groupId,
      name: groupResult.data?.name || 'Unknown Group',
      description: groupResult.data?.description || '',
      memberCount: groupResult.data?.memberCount || 0,
      robux: fundsResult.ok ? fundsResult.robux : 0,
      groupOwner: groupResult.data?.owner?.username || 'Unknown',
      groupIconUrl: iconResult.ok ? iconResult.iconUrl : null,
      // ข้อมูลรายได้/รายจ่าย
      groupPayoutRobux: revenueResult.ok ? revenueResult.groupPayoutRobux : 0,
      itemSaleRobux: revenueResult.ok ? revenueResult.itemSaleRobux : 0,
      pendingRobux: revenueResult.ok ? revenueResult.pendingRobux : 0,
    };
  } catch (err) {
    console.error('[Roblox] Error fetching group data:', err.message);
    return null;
  }
}

/**
 * สร้าง Embed สำหรับ Payment
 */
function buildPaymentEmbed(group) {
  // ยอดรวมที่เคยมี = Robux คงเหลือ + การจ่ายค่าตอบแทนชุมชน (ที่จ่ายออกไปแล้ว)
  const totalEverHad = group.robux + (group.groupPayoutRobux || 0);

  const embed = new EmbedBuilder()
    .setColor('#EFFCFF')
    .setTitle('ROBUX GROUP AUTO')
    .setFooter({ text: '© discord.gg/snowwhite | All Rights Reserved.' })
    .addFields(
      {
        name: '<:Ts_12_discord_abane:1397694204863315998> เงื่อนไขอ่านก่อนทำรายการ',
        value: `\`\`\`เติมเงินผ่านซองอั่งเปา -5 บาทต่อ 1 link\`\`\``,
        inline: false
      },
      {
        name: '<:Icon_Square_robux_1:1397902872146083861> Robux ทั้งหมดที่เคยมี',
        value: `\`\`\`${totalEverHad.toLocaleString()} R$\`\`\``,
        inline: true
      },
      {
        name: '<:Icon_Square_robux_1:1397902872146083861> Robux คงเหลือ',
        value: `\`\`\`${group.robux.toLocaleString()}\`\`\``,
        inline: true
      }
    )
    .setImage("https://img5.pic.in.th/file/secure-sv1/robloxeaea4c4e82b0c508.png");

  return embed;
}

/**
 * สร้าง Button Rows
 */
function buildButtonRows(groupId) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('buy_topup')
      .setLabel('เติมเงิน')
      .setEmoji('<:Ts_19_discord_coin:1397694253676630066>')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('chack_topup')
      .setLabel('เช็คยอดเงิน')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('roblox_check')
      .setLabel('ซื้อ Robux')
      .setEmoji('<:Ts_20_discord_shop:1397694256067514622>')
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('เข้าร่วมกลุ่ม Roblox คลิกที่นี่')
      .setURL(`https://www.roblox.com/groups/${groupId}`)
      .setEmoji('<:Icon_Square_roblox_1:1397902874809204767>')
  );

  return [row1, row2];
}

// เก็บ interval ของแต่ละ message
const refreshIntervals = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("payment")
    .setDescription("ส่ง embed สำหรับจ่ายเงินไปที่ห้อง (ไม่ใส่ channelId = ส่งในห้องนี้)")
    .addStringOption(o => o.setName("channelid").setDescription("ID ห้องปลายทาง").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const channelId = interaction.options.getString("channelid") || interaction.channelId;
    const channel = client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased?.()) {
      return interaction.editReply("❌ ไม่พบห้องปลายทางหรือส่งข้อความไม่ได้");
    }

    // ดึงข้อมูล Roblox Group
    const group = await fetchRobloxGroupData();

    if (!group) {
      // Fallback - ถ้าดึงข้อมูลไม่ได้
      const embed = new EmbedBuilder()
        .setColor('#EFFCFF')
        .setTitle('<:Icon_Square_roblox_1:1397902874809204767> ระบบตรวจสอบสิทธิ์รับ Robux')
        .setDescription('❌ ไม่สามารถดึงข้อมูลกลุ่มได้ กรุณาลองใหม่ภายหลัง')
        .setFooter({ text: '© discord.gg/snowwhite | All Rights Reserved.' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('buy_topup')
          .setLabel('เติมเงิน')
          .setEmoji('<:Ts_19_discord_coin:1397694253676630066>')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('chack_topup')
          .setLabel('เช็คยอดเงิน')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('roblox_check')
          .setLabel('ซื้อ Robux')
          .setEmoji('<:Ts_20_discord_shop:1397694256067514622>')
          .setStyle(ButtonStyle.Primary)
      );

      await channel.send({ embeds: [embed], components: [row] });
      return interaction.editReply(`✅ ส่ง embed ไปที่ <#${channelId}> แล้ว`);
    }

    // สร้างและส่ง embed
    const embed = buildPaymentEmbed(group);
    const [row1, row2] = buildButtonRows(group.groupId);
    const sentMessage = await channel.send({ embeds: [embed], components: [row1, row2] });

    // ตั้ง auto-refresh ทุก 10 วินาที
    const REFRESH_INTERVAL = 10000; // 10 วินาที

    const intervalId = setInterval(async () => {
      try {
        // ตรวจสอบว่า message ยังอยู่หรือไม่
        const msg = await channel.messages.fetch(sentMessage.id).catch(() => null);
        if (!msg) {
          // Message ถูกลบแล้ว - หยุด refresh
          clearInterval(intervalId);
          refreshIntervals.delete(sentMessage.id);
          console.log(`[Payment] Stopped refresh for deleted message ${sentMessage.id}`);
          return;
        }

        // ดึงข้อมูลใหม่
        const newGroup = await fetchRobloxGroupData();
        if (!newGroup) return;

        // อัพเดท embed
        const newEmbed = buildPaymentEmbed(newGroup);
        await msg.edit({ embeds: [newEmbed], components: [row1, row2] });
        console.log(`[Payment] Refreshed Robux: ${newGroup.robux}`);
      } catch (err) {
        console.error('[Payment] Auto-refresh error:', err.message);
        // ถ้า error ซ้ำ ๆ ให้หยุด
        if (err.message.includes('Unknown Message') || err.message.includes('Missing Access')) {
          clearInterval(intervalId);
          refreshIntervals.delete(sentMessage.id);
        }
      }
    }, REFRESH_INTERVAL);

    // เก็บ interval ID
    refreshIntervals.set(sentMessage.id, intervalId);

    await interaction.editReply(`✅ ส่ง embed ไปที่ <#${channelId}> แล้ว (อัพเดททุก 10 วินาที)`);
  }
};
