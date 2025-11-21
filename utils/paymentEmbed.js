// utils/paymentEmbed.js
const { EmbedBuilder } = require("discord.js");

/**
 * รับ cfg จาก logdata.json แล้วสร้าง Embed โดย "ใส่เฉพาะ" ค่าที่มีจริง
 * คีย์ที่รองรับ:
 *  - payment_title
 *  - payment_desc
 *  - payment_author_name
 *  - payment_author_icon
 *  - payment_footer_text
 *  - payment_footer_icon
 *  - payment_field_name
 *  - payment_field_value
 *  - payment_color (เลขฐานสิบ เช่น 3618621) (optional)
 */
function buildPaymentEmbed(cfg = {}) {
  const color = Number.isFinite(Number(cfg.payment_color)) ? Number(cfg.payment_color) : 3618621;
  const embed = new EmbedBuilder().setColor(color);

  if (truthy(cfg.payment_title)) embed.setTitle(String(cfg.payment_title));
  if (truthy(cfg.payment_desc)) embed.setDescription(String(cfg.payment_desc));

  const authorName = strOrEmpty(cfg.payment_author_name);
  const authorIcon = strOrEmpty(cfg.payment_author_icon);
  if (authorName || authorIcon) {
    embed.setAuthor({
      name: authorName || "\u200b",
      iconURL: authorIcon || undefined,
    });
  }

  const footerText = strOrEmpty(cfg.payment_footer_text);
  const footerIcon = strOrEmpty(cfg.payment_footer_icon);
  if (footerText || footerIcon) {
    embed.setFooter({
      text: footerText || "\u200b",
      iconURL: footerIcon || undefined,
    });
  }

  const fieldName  = strOrEmpty(cfg.payment_field_name);
  const fieldValue = strOrEmpty(cfg.payment_field_value);
  if (fieldName && fieldValue) {
    embed.addFields({ name: fieldName, value: fieldValue, inline: false });
  }

  return embed;
}

function truthy(v) {
  return v !== undefined && v !== null && String(v).trim() !== "";
}
function strOrEmpty(v) {
  return truthy(v) ? String(v).trim() : "";
}

module.exports = { buildPaymentEmbed };
