// // bank/bank_slipOk.js (patched → เปลี่ยนโครงเป็น handler เดียว)
// const fs = require('fs');
// const path = require('path');
// const sharp = require('sharp');
// const QRCode = require('qrcode');
// const moment = require('moment-timezone');
// const generatePayload = require('promptpay-qr');
// const {
//   TextInputBuilder, ActionRowBuilder, ModalBuilder, TextInputStyle,
//   EmbedBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags
// } = require('discord.js');

// const QR_FOLDER = path.join(__dirname, 'uploads');
// if (!fs.existsSync(QR_FOLDER)) fs.mkdirSync(QR_FOLDER, { recursive: true });

// function readLogdata() {
//   try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../update/logdata.json'), 'utf8')) || {}; }
//   catch { return {}; }
// }

// module.exports = {
//   name: 'interactionCreate',
//   async execute(client, interaction) {
//     // ===== ตัวที่ 1: เปิด Modal เติม PromptPay =====
//     try {
//       const PriceMin = Number(readLogdata()?.เติมเงินขั้นต่ำของธนาคาร ?? 5) || 5;

//       if (interaction.isStringSelectMenu() && interaction.customId === 'teram_topup') {
//         const selectedValue = interaction.values?.[0];
//         if (selectedValue === 'reset_memubank') {
//           return interaction.update({ withResponse: true });
//         }
//         if (selectedValue === 'เติมสแกนจ่าย') {
//           const modal = new ModalBuilder()
//             .setCustomId('promptpay_modal')
//             .setTitle('เติมเงินผ่านพร้อมเพย์')
//             .addComponents(
//               new ActionRowBuilder().addComponents(
//                 new TextInputBuilder()
//                   .setCustomId('promptpay')
//                   .setLabel('[ 👛 จำนวนเงินที่ต้องการเติม ]')
//                   .setStyle(TextInputStyle.Short)
//                   .setPlaceholder(`ขั้นต่ำ ${PriceMin} บาท`)
//                   .setRequired(true)
//               )
//             );
//           return interaction.showModal(modal);
//         }
//       }
//     } catch (err) {
//       console.error('Modals Bank Error bank_slipOk', err);
//     }

//     // ===== ตัวที่ 2: ส่ง QR + เคานต์ดาวน์ + role ชั่วคราว =====
//     if (!(interaction.isModalSubmit() && interaction.customId === 'promptpay_modal')) return;

//     const replyErr = async (title) => {
//       const e = new EmbedBuilder().setColor(0xFF3300).setTitle(title);
//       if (interaction.deferred || interaction.replied) {
//         return interaction.editReply({ embeds: [e], flags: MessageFlags.Ephemeral }).catch(() => {});
//       }
//       return interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral }).catch(() => {});
//     };

//     try {
//       const cfg = readLogdata();
//       const PriceMin = Number(cfg?.เติมเงินขั้นต่ำของธนาคาร ?? 5) || 5;

//       const amountStr = interaction.fields.getTextInputValue('promptpay').trim();
//       const amount = Number(amountStr);
//       if (!Number.isFinite(amount) || amount <= 0) return replyErr('❌ กรุณาระบุจำนวนเงินมากกว่า 0');
//       if (amount < PriceMin) return replyErr(`❌ ต้องไม่ต่ำกว่า ${PriceMin} บาท`);

//       const phone = String(cfg?.เบอร์รับเงินพ้อมเพย์ || '').replace(/\D/g, '');
//       const ChannelCheck = String(cfg?.ไอดีช่องเช็คสลิป || '');
//       if (phone.length !== 10) return replyErr('❌ ยังไม่ได้ตั้งค่า “เบอร์พร้อมเพย์” (10 หลัก)');
//       if (!ChannelCheck) return replyErr('❌ ยังไม่ได้ตั้งค่า “ไอดีช่องเช็คสลิป”');

//       const Role_checkTimeID = cfg?.ยศไอดีเช็คสลิป;
//       if (!Role_checkTimeID) return replyErr('❌ กรุณาเพิ่ม ID ยศสำหรับเช็คสลิปก่อน');

//       // gen payload + ไฟล์ QR
//       const payload = generatePayload(phone, { amount });
//       const rawQR = path.join(QR_FOLDER, `qr_${phone}_${amount}.png`);
//       await QRCode.toFile(rawQR, payload);
//       if (!fs.existsSync(rawQR)) return replyErr('❌ ไม่สามารถสร้าง QR ได้');

//       const resized = path.join(QR_FOLDER, `qr_${interaction.user.id}_${Date.now()}.png`);
//       await sharp(rawQR).resize(250, 250).toFile(resized);
//       const attachment = new AttachmentBuilder(resized);

//       const minutes_cfg = Number(cfg?.ปรับกำหนดเวลาเช็คสลิป ?? 5) || 5;
//       const countdownSec = minutes_cfg * 60;
//       const target = moment().tz('Asia/Bangkok').unix() + countdownSec;

//       // แจก role ชั่วคราว
//       const role = interaction.guild.roles.cache.get(Role_checkTimeID);
//       if (role) {
//         try { await interaction.member.roles.add(role); }
//         catch (e) {
//           if (e?.code === 50013) return replyErr('❌ บอทมียศต่ำกว่ายศ “เช็คสลิป”');
//           console.error('add role error:', e);
//         }
//       }

//       const serverID = interaction.guild.id;
//       const embed = new EmbedBuilder()
//         .setColor(0x37373D)
//         .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
//         .setTitle('🏛️ เติมเงินผ่านพร้อมเพย์')
//         .addFields(
//           { name: `🕐 กรุณาชำระภายใน ${minutes_cfg} นาที`, value: '_ _' },
//           { name: '👛 จำนวนเงินที่ต้องชำระ', value: `\`${amount.toFixed(2)} THB\`` }
//         )
//         .setThumbnail(interaction.user.displayAvatarURL())
//         .setImage(`attachment://${path.basename(resized)}`)
//         .setFooter({ text: 'สแกนคิวอาร์โค้ด・บันทึกรูปภาพไปสแกน' });

//       const row = new ActionRowBuilder().addComponents(
//         new ButtonBuilder()
//           .setURL(`https://discord.com/channels/${serverID}/${ChannelCheck}`)
//           .setLabel('✅ โอนแล้วแนบสลิปที่นี่')
//           .setStyle(ButtonStyle.Link)
//       );

//       await interaction.reply({ embeds: [embed], components: [row], files: [attachment], flags: MessageFlags.Ephemeral }).catch(() => {});
//       try { fs.unlinkSync(resized); } catch {}

//       // เคานต์ดาวน์แก้ไข embed
//       const tick = setInterval(async () => {
//         try {
//           const now = moment().tz('Asia/Bangkok').unix();
//           const left = Math.max(0, target - now);
//           const m = Math.floor(left / 60);
//           const s = left % 60;

//           if (left <= 0) {
//             clearInterval(tick);
//             if (role) { try { await interaction.member.roles.remove(role); } catch (e) { console.error('remove role:', e); } }
//             const timeoutEmbed = new EmbedBuilder()
//               .setColor(0x37373D)
//               .setTitle('❌ เกินเวลาที่กำหนด')
//               .setDescription('- หากทำรายการไม่ทันให้เปิดเมนูเติมเงินใหม่อีกครั้ง\n- แนบสลิปไม่ทันให้เปิดเมนูเติมเงินใหม่แล้วแนบได้เลย\n\nขออภัยหากคุณได้ทำรายการไปแล้ว')
//               .setThumbnail(interaction.user.displayAvatarURL());
//             return interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
//           }

//           const updated = EmbedBuilder.from(embed)
//             .spliceFields(1, 0, { name: '🕐 เหลือเวลาอีก', value: `\`${m} นาที ${s.toString().padStart(2, '0')} วินาที\`` });
//           await interaction.editReply({ embeds: [updated] }).catch(() => {});

//         } catch (e) {
//           clearInterval(tick);
//           console.error('countdown edit error:', e);
//         }
//       }, 1000);
//     } catch (err) {
//       console.error('Bank isModalSubmit bank_slipOk', err);
//       await replyErr('❌ เกิดข้อผิดพลาด ไม่สามารถทำรายการได้');
//     }
//   }
// };
// bank/bank_slipOk.js  — SAFE on Azure (no sharp, no file I/O)
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const moment = require('moment-timezone');
const generatePayload = require('promptpay-qr');
const {
  TextInputBuilder, ActionRowBuilder, ModalBuilder, TextInputStyle,
  EmbedBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder
} = require('discord.js');

function readLogdata() {
  try {
    const p = path.join(__dirname, '../update/logdata.json');
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, 'utf8')) || {};
  } catch {
    return {};
  }
}

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    // ===== (1) เปิด Modal เติม PromptPay =====
    try {
      if (interaction.isStringSelectMenu() && interaction.customId === 'teram_topup') {
        const cfg = readLogdata();
        const PriceMin = Number(cfg?.เติมเงินขั้นต่ำของธนาคาร ?? 5) || 5;
        const selectedValue = interaction.values?.[0];

        // รีเฟรชเมนู (update = ack) — อย่าเรียก modal ต่อจากนี่
        if (selectedValue === 'reset_memubank') {
          return interaction.update({
            content: interaction.message.content ?? null,
            embeds: interaction.message.embeds ?? [],
            components: interaction.message.components ?? []
          }).catch(() => {});
        }

        if (selectedValue === 'เติมสแกนจ่าย') {
          // เปิด modal ต้องมาก่อน ack เสมอ
          if (interaction.replied || interaction.deferred) return;

          const modal = new ModalBuilder()
            .setCustomId('promptpay_modal')
            .setTitle('เติมเงินผ่านพร้อมเพย์')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('promptpay')
                  .setLabel('[ 👛 จำนวนเงินที่ต้องการเติม ]')
                  .setStyle(TextInputStyle.Short)
                  .setPlaceholder(`ขั้นต่ำ ${PriceMin} บาท`)
                  .setRequired(true)
              )
            );

          return interaction.showModal(modal);
        }
      }
    } catch (err) {
      console.error('Modals Bank Error bank_slipOk:', err?.stack || err);
    }

    // ===== (2) หลัง submit modal → สร้าง QR + ส่ง + เคานต์ดาวน์ =====
    if (!(interaction.isModalSubmit() && interaction.customId === 'promptpay_modal')) return;

    const replyErr = async (title) => {
      const e = new EmbedBuilder().setColor(0xFF3300).setTitle(title);
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ embeds: [e] }).catch(() => {});
      }
      return interaction.reply({ embeds: [e], ephemeral: true }).catch(() => {});
    };

    try {
      const cfg = readLogdata();
      const PriceMin = Number(cfg?.เติมเงินขั้นต่ำของธนาคาร ?? 5) || 5;

      const amountStr = interaction.fields.getTextInputValue('promptpay').trim();
      const amount = Number(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) return replyErr('❌ กรุณาระบุจำนวนเงินมากกว่า 0');
      if (amount < PriceMin) return replyErr(`❌ ต้องไม่ต่ำกว่า ${PriceMin} บาท`);

      const phone = String(cfg?.เบอร์รับเงินพ้อมเพย์ || '').replace(/\D/g, '');
      const ChannelCheck = String(cfg?.ไอดีช่องเช็คสลิป || '');
      if (phone.length !== 10) return replyErr('❌ ยังไม่ได้ตั้งค่า “เบอร์พร้อมเพย์” (10 หลัก)');
      if (!ChannelCheck) return replyErr('❌ ยังไม่ได้ตั้งค่า “ไอดีช่องเช็คสลิป”');

      const Role_checkTimeID = cfg?.ยศไอดีเช็คสลิป;
      if (!Role_checkTimeID) return replyErr('❌ กรุณาเพิ่ม ID ยศสำหรับเช็คสลิปก่อน');

      // ✅ gen QR เป็น Buffer (ไม่แตะไฟล์, ไม่ใช้ sharp)
      const payload = generatePayload(phone, { amount });
      const pngBuffer = await QRCode.toBuffer(payload, { width: 250, errorCorrectionLevel: 'M' });
      const attachment = new AttachmentBuilder(pngBuffer, { name: `qr_${phone}_${amount}.png` });

      const minutes_cfg = Number(cfg?.ปรับกำหนดเวลาเช็คสลิป ?? 5) || 5;
      const countdownSec = minutes_cfg * 60;
      const targetTs = Math.floor(Date.now() / 1000) + countdownSec;

      // แจก role ชั่วคราว (กัน member null)
      const role = Role_checkTimeID ? interaction.guild.roles.cache.get(Role_checkTimeID) : null;
      const member = interaction.member ?? await interaction.guild.members
        .fetch(interaction.user.id).catch(() => null);
      if (role && member) {
        try { await member.roles.add(role); }
        catch (e) {
          if (e?.code === 50013) return replyErr('❌ บอทมียศต่ำกว่ายศ “เช็คสลิป”');
          console.error('add role error:', e);
        }
      }

      const serverID = interaction.guild.id;
      const embed = new EmbedBuilder()
        .setColor(0x37373D)
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
        .setTitle('🏛️ เติมเงินผ่านพร้อมเพย์')
        .addFields(
          { name: `🕐 กรุณาชำระภายใน ${minutes_cfg} นาที`, value: '_ _' },
          { name: '👛 จำนวนเงินที่ต้องชำระ', value: `\`${amount.toFixed(2)} THB\`` }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setImage(`attachment://qr_${phone}_${amount}.png`)
        .setFooter({ text: 'สแกนคิวอาร์โค้ด・บันทึกรูปภาพไปสแกน' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setURL(`https://discord.com/channels/${serverID}/${ChannelCheck}`)
          .setLabel('✅ โอนแล้วแนบสลิปที่นี่')
          .setStyle(ButtonStyle.Link)
      );

      // ✅ ephemeral ที่ถูกต้อง
      await interaction.reply({ embeds: [embed], components: [row], files: [attachment], ephemeral: true }).catch(() => {});

      // เคานต์ดาวน์แก้ไข embed
      const tick = setInterval(async () => {
        try {
          const now = Math.floor(Date.now() / 1000);
          const left = Math.max(0, targetTs - now);
          const m = Math.floor(left / 60);
          const s = left % 60;

          if (left <= 0) {
            clearInterval(tick);
            if (role && member) {
              try { await member.roles.remove(role); } catch (e) { console.error('remove role:', e); }
            }
            const timeoutEmbed = new EmbedBuilder()
              .setColor(0x37373D)
              .setTitle('❌ เกินเวลาที่กำหนด')
              .setDescription('- หากทำรายการไม่ทันให้เปิดเมนูเติมเงินใหม่อีกครั้ง\n- แนบสลิปไม่ทันให้เปิดเมนูเติมเงินใหม่แล้วแนบได้เลย\n\nขออภัยหากคุณได้ทำรายการไปแล้ว')
              .setThumbnail(interaction.user.displayAvatarURL());
            return interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
          }

          const updated = EmbedBuilder.from(embed)
            .spliceFields(1, 0, { name: '🕐 เหลือเวลาอีก', value: `\`${m} นาที ${s.toString().padStart(2, '0')} วินาที\`` });

          await interaction.editReply({ embeds: [updated] }).catch(() => {});
        } catch (e) {
          clearInterval(tick);
          console.error('countdown edit error:', e);
        }
      }, 1000);
    } catch (err) {
      console.error('Bank isModalSubmit bank_slipOk FAILED:', err?.stack || err);
      await replyErr('❌ เกิดข้อผิดพลาด ไม่สามารถทำรายการได้');
    }
  }
};
