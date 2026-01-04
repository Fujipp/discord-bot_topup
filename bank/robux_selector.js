// bank/robux_selector.js
// Handler สำหรับปุ่ม "เช็คสิทธิ์รับ Robux" พร้อม Modal กรอก username, ยืนยันการซื้อ, queue และ notification
const fs = require("fs");
const path = require("path");
const {
    EmbedBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require("discord.js");
const ConfigManager = require("../utils/configManager");
const { getBalance, hasTopupHistory, getTopupHistory, deductBalance } = require("./base");
const { checkRobloxEligibility, makeOneTimePayout, getUserAvatarUrl } = require("../api/roblox");

const COLOR = 3618621;

// ===== Payout Stats Tracking =====
const STATS_PATH = path.resolve(process.cwd(), "update/payout_stats.json");

function loadPayoutStats() {
    try {
        if (fs.existsSync(STATS_PATH)) {
            return JSON.parse(fs.readFileSync(STATS_PATH, "utf8"));
        }
    } catch (e) { }
    return { totalRobux: 0, payoutCount: 0 };
}

function savePayoutStats(stats) {
    try {
        fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2));
    } catch (e) {
        console.error("[Stats] Failed to save:", e);
    }
}

function recordPayoutStats(robuxAmount) {
    const stats = loadPayoutStats();
    stats.totalRobux = (stats.totalRobux || 0) + robuxAmount;
    stats.payoutCount = (stats.payoutCount || 0) + 1;
    savePayoutStats(stats);
    return stats;
}

// Export สำหรับ payment.js
module.exports.getPayoutStats = loadPayoutStats;

// ===== Fixed Packages สำหรับแต่ละเรท =====
const PACKAGES_RATE_3_5 = [
    { robux: 200, price: 58 },
    { robux: 300, price: 86 },
    { robux: 350, price: 100 },
    { robux: 400, price: 115 },
    { robux: 500, price: 143 },
    { robux: 600, price: 172 },
    { robux: 800, price: 229 },
    { robux: 1000, price: 286 },
    { robux: 1200, price: 343 },
    { robux: 1400, price: 400 },
    { robux: 1600, price: 455 },
    { robux: 2000, price: 570 },
    { robux: 3000, price: 855 },
    { robux: 4000, price: 1140 },
    { robux: 5000, price: 1425 },
    { robux: 7000, price: 2000 },
    { robux: 10000, price: 2850 },
    { robux: 20000, price: 5700 },
];

const PACKAGES_RATE_4 = [
    { robux: 200, price: 50 },
    { robux: 300, price: 75 },
    { robux: 400, price: 100 },
    { robux: 500, price: 125 },
    { robux: 600, price: 150 },
    { robux: 800, price: 200 },
    { robux: 1200, price: 300 },
    { robux: 1400, price: 350 },
    { robux: 1600, price: 400 },
    { robux: 2000, price: 500 },
    { robux: 3000, price: 750 },
    { robux: 4000, price: 1000 },
    { robux: 5000, price: 1250 },
    { robux: 7000, price: 1750 },
    { robux: 10000, price: 2500 },
    { robux: 20000, price: 4900 },
];

// ===== Payout Queue System =====
const payoutQueue = [];
let isProcessingQueue = false;

/**
 * เพิ่ม payout เข้า queue
 */
function addToQueue(payoutData) {
    payoutQueue.push(payoutData);
    processQueue();
}

/**
 * ประมวลผล queue
 */
async function processQueue() {
    if (isProcessingQueue || payoutQueue.length === 0) return;

    isProcessingQueue = true;
    const cooldown = Number(ConfigManager.get('ROBUX_PAYOUT_COOLDOWN', 5)) * 1000;

    while (payoutQueue.length > 0) {
        const payout = payoutQueue.shift();
        try {
            await processPayout(payout);
        } catch (err) {
            console.error('[PayoutQueue] Error processing payout:', err);
        }

        // Cooldown ระหว่าง payout
        if (payoutQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, cooldown));
        }
    }

    isProcessingQueue = false;
}

/**
 * ประมวลผล payout จริง
 */
async function processPayout(payoutData) {
    const { interaction, purchaseId, robloxUserId, pkg, discordUserId, client } = payoutData;

    try {
        // ทำ Payout
        const payoutResult = await makeOneTimePayout(robloxUserId, pkg.robux);

        const avatarUrl = interaction.user?.displayAvatarURL() || '';
        const username = interaction.user?.username || 'Unknown';
        const newBalance = Number(getBalance(discordUserId));

        if (!payoutResult.ok) {
            // Payout ล้มเหลว - คืนเงิน (เพราะหักไปแล้วตอน confirm)
            console.log(`[Payout] Failed for ${username}, refunding ${pkg.price} baht`);
            const { addBalance } = require('./base');
            addBalance(discordUserId, pkg.price);

            await sendNotification(client, {
                success: false,
                username,
                robloxUserId,
                robux: pkg.robux,
                price: pkg.price,
                error: payoutResult.error?.message || 'Unknown error',
            });
            return;
        }

        // Payout สำเร็จ - เงินหักไปแล้วตอน confirm
        recordPayoutStats(pkg.robux); // บันทึกสถิติ

        await sendNotification(client, {
            success: true,
            username,
            robloxUserId,
            robux: pkg.robux,
            price: pkg.price,
            newBalance,
        });

    } catch (err) {
        console.error('[PayoutQueue] processPayout error:', err);
    }
}

/**
 * ส่งแจ้งเตือนไปช่องที่กำหนด (พร้อม Roblox Avatar)
 */
async function sendNotification(client, data) {
    const channelId = ConfigManager.get('ROBUX_NOTIFY_CHANNEL');
    if (!channelId || !client) return;

    try {
        const channel = client.channels.cache.get(String(channelId));
        if (!channel?.isTextBased?.()) return;

        // ดึง Roblox Avatar
        let avatarUrl = null;
        if (data.robloxUserId) {
            const avatarResult = await getUserAvatarUrl(data.robloxUserId);
            if (avatarResult.ok) {
                avatarUrl = avatarResult.avatarUrl;
            }
        }

        const embed = new EmbedBuilder()
            .setFooter({ text: '© discord.gg/snowwhite | All Rights Reserved.' })
            .setTimestamp();

        if (avatarUrl) {
            embed.setThumbnail(avatarUrl);
        }

        if (data.success) {
            embed.setColor(0xEFFCFF)
                .setTitle('<:Ts_22_discord_1ture:1397892606209429584> Payout สำเร็จ!')
                .addFields(
                    { name: '<:Ts_9_discord_member:1397694189575344298> Discord User', value: `\`\`\`${data.username}\`\`\``, inline: true },
                    { name: '<:Icon_Square_roblox_1:1397902874809204767> Roblox ID', value: `\`\`\`${data.robloxUserId}\`\`\``, inline: true },
                    { name: '<:Icon_Square_robux_1:1397902872146083861> Robux', value: `\`\`\`${data.robux} R$\`\`\``, inline: false },
                    { name: '<:Ts_19_discord_coin:1397694253676630066> ราคา', value: `\`\`\`${data.price} บาท\`\`\``, inline: true },
                    { name: '💰 ยอดคงเหลือ', value: `\`\`\`${data.newBalance?.toFixed(2) || '0.00'} บาท\`\`\``, inline: true },
                );
        } else {
            embed.setColor(0xFF0000)
                .setTitle('<:Ts_22_discord_1false:1397892604040974479> Payout ล้มเหลว!')
                .addFields(
                    { name: '<:Ts_9_discord_member:1397694189575344298> Discord User', value: `\`\`\`${data.username}\`\`\``, inline: true },
                    { name: '<:Icon_Square_roblox_1:1397902874809204767> Roblox ID', value: `\`\`\`${data.robloxUserId}\`\`\``, inline: true },
                    { name: '<:Icon_Square_robux_1:1397902872146083861> Robux', value: `\`\`\`${data.robux} R$\`\`\``, inline: false },
                    { name: '❌ Error', value: `\`\`\`${data.error}\`\`\``, inline: false },
                );
        }

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('[Notification] Failed to send:', err);
    }
}

/**
 * ดึง Robux packages ตามเรทที่เลือก
 */
function getRobuxPackages() {
    const rate = String(ConfigManager.get('ROBUX_RATE', '3.5'));

    if (rate === '4') {
        return PACKAGES_RATE_4.map(pkg => ({
            ...pkg,
            label: `${pkg.robux} Robux`,
        }));
    }

    // Default: rate 3.5
    return PACKAGES_RATE_3_5.map(pkg => ({
        ...pkg,
        label: `${pkg.robux} Robux`,
    }));
}

/**
 * สร้าง Modal สำหรับกรอก Roblox username
 */
function createUsernameModal() {
    return new ModalBuilder()
        .setCustomId('roblox_username_modal')
        .setTitle('เช็คสิทธิ์รับ Robux')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('roblox_username_input')
                    .setLabel('🎮 กรอก Username Roblox ของคุณ')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('เช่น builderman')
                    .setRequired(true)
                    .setMinLength(3)
                    .setMaxLength(20)
            )
        );
}

// Cache สำหรับเก็บข้อมูล pending purchase
const pendingPurchases = new Map();

module.exports = {
    name: "interactionCreate",
    async execute(client, interaction) {
        try {
            // ===== Handle button click: roblox_check - แสดง Modal =====
            if (interaction.isButton() && interaction.customId === "roblox_check") {
                // ตรวจสอบว่าระบบ Robux เปิดอยู่หรือไม่
                const isEnabled = ConfigManager.get('ROBUX_ENABLED');
                if (isEnabled === false || isEnabled === 'false') {
                    const disabledEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⛔ ระบบ Robux ปิดอยู่')
                        .setDescription('ขณะนี้ระบบเติม Robux ปิดให้บริการชั่วคราว\n\nกรุณาติดต่อ Admin หากมีข้อสงสัย')
                        .setFooter({ text: '© discord.gg/snowwhite | All Rights Reserved.' });
                    return interaction.reply({ embeds: [disabledEmbed], flags: MessageFlags.Ephemeral });
                }
                return interaction.showModal(createUsernameModal());
            }

            // ===== Handle Modal Submit: roblox_username_modal =====
            if (interaction.isModalSubmit() && interaction.customId === "roblox_username_modal") {
                const username = interaction.fields.getTextInputValue('roblox_username_input').trim();
                const avatarUrl = interaction.user.displayAvatarURL();

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const result = await checkRobloxEligibility(username);

                if (!result.ok || !result.eligible) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(result.color || 0xed4245)
                        .setTitle('<:Ts_22_discord_1false:1397892604040974479> ไม่มีสิทธิ์รับ Robux')
                        .setThumbnail(avatarUrl)
                        .setDescription(result.message || 'ไม่สามารถตรวจสอบสิทธิ์ได้')
                        .addFields({ name: '🎮 Roblox Username', value: `\`\`\`${username}\`\`\``, inline: true })
                        .setFooter({ text: '© discord.gg/snowwhite | All Rights Reserved.' });

                    return interaction.editReply({ embeds: [errorEmbed] });
                }

                // ดึงยอด Robux ในกลุ่มเพื่อเช็คว่าพอไหม
                const { getGroupFunds } = require("../api/roblox");
                const fundsResult = await getGroupFunds();
                const groupRobux = fundsResult.ok ? fundsResult.robux : 0;

                // มีสิทธิ์ - แสดง packages (จำกัดแค่ 25 options)
                const packages = getRobuxPackages().slice(0, 25);
                const balance = Number(getBalance(interaction.user.id));
                const rate = String(ConfigManager.get('ROBUX_RATE', '3.5'));

                const options = packages.map((pkg, index) => {
                    const canAfford = balance >= pkg.price;
                    const groupHasEnough = groupRobux >= pkg.robux;
                    const canSelect = canAfford && groupHasEnough;

                    let description = '';
                    if (!groupHasEnough) {
                        description = '❌ ยอดในกลุ่มไม่พอ';
                    } else if (!canAfford) {
                        description = '❌ ยอดเงินไม่พอ';
                    } else {
                        description = '✅';
                    }

                    return {
                        label: `${pkg.robux} Robux (${pkg.price} บาท)`,
                        value: `robux_pkg_${index}_${result.userId}`,
                        description: description,
                        emoji: { id: "1397902872146083861", name: "Icon_Square_robux_1" },
                        default: false,
                    };
                });

                // Filter out options where group doesn't have enough (disabled = not in list)
                const selectableOptions = options.filter((opt, index) => {
                    const pkg = packages[index];
                    return groupRobux >= pkg.robux;
                });

                const successEmbed = new EmbedBuilder()
                    .setColor(result.color || 0x3ba55d)
                    .setTitle('<:Ts_22_discord_1ture:1397892606209429584> มีสิทธิ์รับ Robux!')
                    .setThumbnail(avatarUrl)
                    .setDescription(`${result.message}\n\n**เลือก package Robux:**`)
                    .addFields(
                        { name: '🎮 Roblox Username', value: `\`\`\`${result.username}\`\`\``, inline: true },
                        { name: '💰 ยอดเงินคงเหลือ', value: `\`\`\`${balance.toFixed(2)} บาท\`\`\``, inline: true },
                        { name: '💱 เรทปัจจุบัน', value: `\`\`\`1 บาท = ${rate} Robux\`\`\``, inline: true },
                        { name: '<:Icon_Square_robux_1:1397902872146083861> Robux ในกลุ่ม', value: `\`\`\`${groupRobux.toLocaleString()} R$\`\`\``, inline: true }
                    )
                    .setFooter({ text: '© discord.gg/snowwhite | All Rights Reserved.' });

                // ถ้าไม่มี package ที่เลือกได้เลย
                if (selectableOptions.length === 0) {
                    successEmbed.setColor(0xFF0000)
                        .setTitle('<:Ts_22_discord_1false:1397892604040974479> ไม่มี Package ที่เลือกได้')
                        .setDescription('ขณะนี้ยอด Robux ในกลุ่มไม่เพียงพอสำหรับทุก Package\n\nกรุณารอสักครู่แล้วลองใหม่อีกครั้ง');
                    return interaction.editReply({ embeds: [successEmbed], components: [] });
                }

                const selectRow = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("robux_package_select")
                        .setPlaceholder("🎮 เลือก Robux Package")
                        .addOptions(selectableOptions)
                );

                return interaction.editReply({ embeds: [successEmbed], components: [selectRow] });
            }

            // ===== Handle select menu: robux_package_select =====
            if (interaction.isStringSelectMenu() && interaction.customId === "robux_package_select") {
                const selected = interaction.values?.[0];
                if (!selected?.startsWith('robux_pkg_')) return;

                const parts = selected.split('_');
                const pkgIndex = parseInt(parts[2], 10);
                const robloxUserId = parts[3] || null;

                const packages = getRobuxPackages();
                const pkg = packages[pkgIndex];

                if (!pkg) {
                    return interaction.reply({ content: '❌ ไม่พบ package', flags: MessageFlags.Ephemeral });
                }

                const balance = Number(getBalance(interaction.user.id));
                const avatarUrl = interaction.user.displayAvatarURL();

                if (balance < pkg.price) {
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('<:Ts_22_discord_1false:1397892604040974479> ยอดเงินไม่เพียงพอ')
                        .setThumbnail(avatarUrl)
                        .addFields(
                            { name: '💰 ยอดคงเหลือ', value: `\`\`\`${balance.toFixed(2)} บาท\`\`\``, inline: true },
                            { name: '💵 ราคา', value: `\`\`\`${pkg.price} บาท\`\`\``, inline: true },
                            { name: '❌ ขาดอีก', value: `\`\`\`${(pkg.price - balance).toFixed(2)} บาท\`\`\``, inline: true }
                        )
                        .setFooter({ text: '© discord.gg/snowwhite | All Rights Reserved.' });

                    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }

                // เก็บ pending purchase
                const purchaseId = `${interaction.user.id}_${Date.now()}`;
                pendingPurchases.set(purchaseId, {
                    discordUserId: interaction.user.id,
                    robloxUserId,
                    pkg,
                    balance,
                    timestamp: Date.now(),
                });

                // ลบ pending เก่า (หมดอายุ 5 นาที)
                for (const [key, val] of pendingPurchases.entries()) {
                    if (Date.now() - val.timestamp > 5 * 60 * 1000) pendingPurchases.delete(key);
                }

                const confirmEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('⚠️ ยืนยันการซื้อ Robux')
                    .setThumbnail(avatarUrl)
                    .setDescription('**ตรวจสอบข้อมูลก่อนยืนยัน**\n\n⚠️ เมื่อกดยืนยัน ระบบจะหักเงินและโอน Robux ทันที')
                    .addFields(
                        { name: '🎮 Package', value: `\`\`\`${pkg.robux} Robux\`\`\``, inline: true },
                        { name: '💵 ราคา', value: `\`\`\`${pkg.price} บาท\`\`\``, inline: true },
                        { name: '💰 ยอดหลังหัก', value: `\`\`\`${(balance - pkg.price).toFixed(2)} บาท\`\`\``, inline: true },
                        { name: '🆔 Roblox ID', value: `\`\`\`${robloxUserId || 'N/A'}\`\`\``, inline: true }
                    )
                    .setFooter({ text: '© discord.gg/snowwhite | All Rights Reserved.' });

                const confirmRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`confirm_robux_${purchaseId}`).setLabel('✅ ยืนยัน').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('cancel_robux_purchase').setLabel('❌ ยกเลิก').setStyle(ButtonStyle.Danger)
                );

                return interaction.reply({ embeds: [confirmEmbed], components: [confirmRow], flags: MessageFlags.Ephemeral });
            }

            // ===== Handle confirm button =====
            if (interaction.isButton() && interaction.customId.startsWith('confirm_robux_')) {
                const purchaseId = interaction.customId.replace('confirm_robux_', '');
                const purchase = pendingPurchases.get(purchaseId);

                if (!purchase || purchase.discordUserId !== interaction.user.id) {
                    return interaction.update({ content: '❌ รายการหมดอายุหรือไม่พบ', embeds: [], components: [] });
                }

                const balance = Number(getBalance(interaction.user.id));
                if (balance < purchase.pkg.price) {
                    pendingPurchases.delete(purchaseId);
                    return interaction.update({ content: '❌ ยอดเงินไม่พอ กรุณาเติมเงินก่อน', embeds: [], components: [] });
                }

                // อัพเดทข้อความเป็น "กำลังดำเนินการ"
                await interaction.update({
                    content: '🔄 กำลังดำเนินการ...',
                    embeds: [],
                    components: [],
                });

                // หักเงินก่อน แล้วเพิ่มเข้า queue
                const deducted = deductBalance(interaction.user.id, purchase.pkg.price);
                if (!deducted) {
                    return interaction.editReply({ content: '❌ ไม่สามารถหักเงินได้' });
                }

                const newBalance = Number(getBalance(interaction.user.id));
                pendingPurchases.delete(purchaseId);

                // เพิ่มเข้า queue
                addToQueue({
                    interaction,
                    purchaseId,
                    robloxUserId: purchase.robloxUserId,
                    pkg: purchase.pkg,
                    discordUserId: interaction.user.id,
                    client,
                });

                const queuePos = payoutQueue.length;
                const successEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('<:Ts_22_discord_1ture:1397892606209429584> กำลังดำเนินการ...')
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setDescription(`✅ **หักเงินเรียบร้อย!**\n\n🔄 กำลังโอน Robux... (คิว #${queuePos})`)
                    .addFields(
                        { name: '🎮 Robux', value: `\`\`\`${purchase.pkg.robux} R$\`\`\``, inline: true },
                        { name: '💵 ราคา', value: `\`\`\`${purchase.pkg.price} บาท\`\`\``, inline: true },
                        { name: '💰 ยอดคงเหลือ', value: `\`\`\`${newBalance.toFixed(2)} บาท\`\`\``, inline: true }
                    )
                    .setFooter({ text: '© discord.gg/snowwhite | Robux จะโอนภายในไม่กี่วินาที' })
                    .setTimestamp();

                // ลบข้อความเดิมหลังจากแสดงผลสำเร็จ (5 วินาที)
                setTimeout(async () => {
                    try {
                        await interaction.deleteReply();
                    } catch (e) { }
                }, 5000);

                return interaction.editReply({ embeds: [successEmbed], components: [] });
            }

            // ===== Handle cancel button =====
            if (interaction.isButton() && interaction.customId === 'cancel_robux_purchase') {
                // ลบข้อความยืนยัน
                return interaction.update({
                    content: '❌ ยกเลิกการซื้อ Robux แล้ว',
                    embeds: [],
                    components: [],
                });
            }

        } catch (e) {
            console.error("robux_selector error:", e);
        }
    }
};
