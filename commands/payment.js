// commands/payment.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs"); const path = require("path");
const { getGroupInfo, getGroupFunds, getGroupIcon, getConfig, getGroupRevenueSummary } = require("../api/roblox");

// Helper function to get config from logdata.json
function getLogdataConfig() {
  try {
    const logdataPath = path.join(__dirname, '..', 'update', 'logdata.json');
    const data = fs.readFileSync(logdataPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('[Payment] Error reading logdata.json:', err.message);
    return {};
  }
}

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
  // Get rate from logdata.json to determine image
  const logdata = getLogdataConfig();
  const rate = parseFloat(logdata.ROBUX_RATE) || 3.5;

  // Select image based on rate
  let imageUrl;
  if (rate >= 4) {
    imageUrl = "https://img5.pic.in.th/file/secure-sv1/IMG_40467ca492945914eecc.png";
  } else {
    // Default to 3.5 rate image
    imageUrl = "https://img2.pic.in.th/875bf3130939b2ba.png";
  }

  console.log(`[Payment] ROBUX_RATE: ${logdata.ROBUX_RATE}, parsed rate: ${rate}, using image: ${rate >= 4 ? 'rate 4' : 'rate 3.5'}`);

  const embed = new EmbedBuilder()
    .setColor('#EFFCFF')
    .setTitle('Robux group auto 24 hours')
    .setFooter({ text: '© discord.gg/snowwhite | All Rights Reserved.' })
    .addFields(
      {
        name: '<:Icon_Square_robux_1:1397902872146083861> Robux คงเหลือ',
        value: `\`\`\`${group.robux.toLocaleString()}\`\`\``,
        inline: false
      },
      {
        name: '📋 วิธีการเติมโรกลุ่ม',
        value: `\`\`\`กด เติมเงิน → ส่งสลิปการโอน → กด ซื้อ Robux โรจะเข้าตัวทันที\`\`\``,
        inline: false
      },
      {
        name: '📌 ข้อควรรู้',
        value: `\`\`\`• สลิปที่ไม่มี Qrcode ระบบจะตรวจสอบยอดเงินไม่ได้ ให้ส่งสลิปมาใน <#ห้องทิกเกต>\n• เติมเงินผ่านซองวอเลต มีค่าธรรมเนียม 5 บาท หากจะเติม 200 บาท ให้ใส่จำนวน 205 บาท\n• สามารถเช็คว่าเติมได้หรือไม่ได้ กดที่ ซื้อโรบัค แล้วใส่ username (ชื่อในเกม หลัง@) เพื่อเช็คได้ทันที\`\`\``,
        inline: false
      }
    )
    .setImage(imageUrl);

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
