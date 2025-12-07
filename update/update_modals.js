// events/update_modals.js
const fs = require("fs");
const path = require("path");
const { TextInputBuilder, ActionRowBuilder, ModalBuilder, TextInputStyle } = require("discord.js");

const LOAD_PATH = path.resolve(__dirname, "../update/logdata.json");

function readBase() {
  try { return JSON.parse(fs.readFileSync(LOAD_PATH, "utf8")); }
  catch { return {}; }
}

module.exports = {
  name: "interactionCreate",
  async execute(_client, interaction) {
    try {
      if (!interaction.isButton?.()) return; // ทำงานเฉพาะปุ่ม

      const base = readBase();

      // ===== ค่าจำเป็นตามสคีมา =====
      const SLIPOK_KEY   = base?.API_SLIPOK_KEY || "SLIPOK_XXXXXX";
      const BRANCH_ID    = base?.SLIPOK_BRANCH_ID || "12345";
      const PP_PHONE     = base?.เบอร์รับเงินพ้อมเพย์ || "064XXXXXXX";
      const MIN_BANK     = base?.เติมเงินขั้นต่ำของธนาคาร || "5";

      const TM_KEY_ID    = base?.API_TRUEMONEY_KEY_ID || "ak_live_xxxxx";
      const TM_BASE      = base?.TRUEMONEY_BASE || "https://true-wallet-voucher-production.up.railway.app";
      const WALLET_PHONE = base?.เบอร์รับเงินวอเลท || "080XXXXXXX";

      const CHK_CH_ID    = base?.ไอดีช่องเช็คสลิป || "";
      const NOTI_CH_ID   = base?.ไอดีช่องแจ้งเตือนเติมเงิน || "";
      const ROLE_CHECK   = base?.ยศไอดีเช็คสลิป || "";
      const ROLE_SUCCESS = base?.ไอดียศได้รับเมื่อเติมเงิน || "";
      const CHECK_MIN    = base?.ปรับกำหนดเวลาเช็คสลิป || "5";

      // === 1) ตั้งค่า API ธนาคาร (SlipOK) ===
      // รองรับทั้ง customId เก่าและใหม่
      if (interaction.customId === "setting_topup" || interaction.customId === "modal_topup_bank") {
        const modal = new ModalBuilder()
          .setCustomId("topup_modal_bank")
          .setTitle("ตั้งค่า API ธนาคาร (SlipOK)")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("slipok_branch_id")
                .setLabel("[ 🔗 SlipOK Branch/Path ID ]")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("เช่น 12345")
                .setRequired(false)
                .setValue(String(BRANCH_ID))
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("slipok_api_key")
                .setLabel("[ ⭐ SlipOK API Key (x-authorization) ]")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("SLIPOK_XXXXXX")
                .setRequired(false)
                .setValue(SLIPOK_KEY)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("promptpay_phone")
                .setLabel("[ 💳 หมายเลขพร้อมเพย์ธนาคาร ]")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("064XXXXXXX")
                .setRequired(false)
                .setValue(PP_PHONE)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("min_amount_bank")
                .setLabel("[ 💰 ขั้นต่ำธนาคาร (บาท) ]")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("เช่น 5")
                .setRequired(false)
                .setValue(String(MIN_BANK))
            ),
          );
        return interaction.showModal(modal);
      }

      // === 2) ตั้งค่า TrueMoney Wallet (Voucher) ===
      // รองรับทั้ง customId เก่าและใหม่
      if (interaction.customId === "setting_topup_wallet" || interaction.customId === "modal_topup_wallet") {
        const modal = new ModalBuilder()
          .setCustomId("topup_modal_wallet")
          .setTitle("ตั้งค่า TrueMoney Wallet (ซองอั่งเปา)")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("wallet_phone")
                .setLabel("[ 🧧 เบอร์รับเงินวอเลต ]")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("080XXXXXXX")
                .setRequired(false)
                .setValue(WALLET_PHONE)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("wallet_key_id")
                .setLabel("[ 🔑 TrueMoney X-Api-Key (KEY_ID) ]")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("ak_live_...")
                .setRequired(false)
                .setValue(TM_KEY_ID)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("wallet_base_url")
                .setLabel("[ 🌐 TrueMoney Base URL ]")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("https://true-wallet-voucher-production.up.railway.app")
                .setRequired(false)
                .setValue(TM_BASE)
            ),
          );
        return interaction.showModal(modal);
      }

      // === 3) ตั้งค่า ช่อง/ยศ/เวลา (ธนาคาร) ===
      // รองรับทั้ง customId เก่าและใหม่
      if (interaction.customId === "setting_channel_bank" || interaction.customId === "modal_channel_bank") {
        const modal = new ModalBuilder()
          .setCustomId("channel_modal_bank")
          .setTitle("ตั้งค่า ช่อง/ยศ/เวลาตรวจสลิป")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("channel_check").setLabel("[ 🆔 ช่องเช็คสลิป ]").setStyle(TextInputStyle.Short).setPlaceholder("ID ช่องเช็คสลิป").setRequired(false).setValue(String(CHK_CH_ID))
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("channel_notify").setLabel("[ 🆔 ช่องแจ้งเตือนเติมเงิน ]").setStyle(TextInputStyle.Short).setPlaceholder("ID ช่องแจ้งเตือน").setRequired(false).setValue(String(NOTI_CH_ID))
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("check_slipid").setLabel("[ 🆔 ยศเช็คสลิป ]").setStyle(TextInputStyle.Short).setPlaceholder("Role ID ช่วงตรวจสลิป").setRequired(false).setValue(String(ROLE_CHECK))
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("role_success").setLabel("[ 🆔 ยศเมื่อเติมเงินสำเร็จ ]").setStyle(TextInputStyle.Short).setPlaceholder("Role ID ที่จะให้เมื่อสำเร็จ").setRequired(false).setValue(String(ROLE_SUCCESS))
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("check_sliptime").setLabel("[ 🕐 เวลาเช็คสลิป (นาที) ]").setStyle(TextInputStyle.Short).setPlaceholder("เช่น 5").setRequired(false).setValue(String(CHECK_MIN))
            ),
          );
        return interaction.showModal(modal);
      }

    } catch (err) {
      console.error("update_modals error:", err);
    }
  }
};
