// index.js
// บอท Discord แบบ "กันพัง" โหลดคำสั่ง/อีเวนต์ปลอดภัย, กันซ้อน, ลอกรัดกุม

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials, ActivityType, Events } = require('discord.js');

// ตรวจ env ก่อน เพื่อกันรันขึ้นแต่ login ไม่ได้
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ Missing DISCORD_TOKEN in environment.');
  // ไม่ process.exit(1) เพื่อให้ server health ยังตอบได้บน PaaS
}

// สร้าง Client พร้อม intents ที่จำเป็นจริง ๆ
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,      // ถ้าไม่ใช้ members ให้ตัดทิ้งเพื่อลดสิทธิ์
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,     // ถ้าไม่อ่านข้อความ ให้ตัดทิ้ง
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ป้องกัน Event ซ้อน: เก็บรายการ (eventName,filePath) ที่ bind ไปแล้ว
const boundEvents = new Set();

// โหลดคำสั่งแบบ /commands/*.js
client.commands = new Collection();
const commandsDir = path.join(__dirname, 'commands');
if (fs.existsSync(commandsDir)) {
  for (const file of fs.readdirSync(commandsDir)) {
    if (!file.endsWith('.js')) continue;
    const full = path.join(commandsDir, file);
    try {
      const cmd = require(full);
      if (cmd?.data?.name && typeof cmd.execute === 'function') {
        client.commands.set(cmd.data.name, cmd);
        // console.log(`✅ Command loaded: ${cmd.data.name}`);
      } else {
        console.warn(`⚠️ Skip command (invalid shape): ${file}`);
      }
    } catch (e) {
      console.error(`❌ Failed to load command ${file}:`, e);
    }
  }
}

// ฟังก์ชัน bind event แบบปลอดภัย (รองรับทั้ง once/on)
const bindEventsFromDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) return;
  for (const file of fs.readdirSync(dirPath)) {
    if (!file.endsWith('.js')) continue;
    const full = path.join(dirPath, file);
    try {
      const mod = require(full);
      // รองรับรูปแบบมาตรฐานของ discord.js v14: { name, once?, execute }
      if (mod?.name && typeof mod.execute === 'function') {
        const key = `${mod.once ? 'once' : 'on'}:${mod.name}:${full}`;
        if (boundEvents.has(key)) continue; // กันซ้ำ
        boundEvents.add(key);
        if (mod.once) {
          client.once(mod.name, (...args) => mod.execute(client, ...args));
        } else {
          client.on(mod.name, (...args) => mod.execute(client, ...args));
        }
        // console.log(`🔗 Bound ${mod.once ? 'once' : 'on'} ${mod.name} <- ${path.relative(process.cwd(), full)}`);
      } else if (mod?.name === 'interactionCreate' || mod?.name === 'messageCreate') {
        // รองรับสไตล์เดิมของ Dev (name + execute)
        const key = `on:${mod.name}:${full}`;
        if (boundEvents.has(key)) continue;
        boundEvents.add(key);
        client.on(mod.name, (...args) => mod.execute(client, ...args));
      } else {
        // ไฟล์ที่ไม่ใช่ event handler ข้ามไปเงียบ ๆ
      }
    } catch (e) {
      console.error(`❌ Failed to bind events from ${full}:`, e);
    }
  }
};

// โหลด events จากโฟลเดอร์ต่าง ๆ ของ Dev
bindEventsFromDir(path.join(__dirname, 'events'));
bindEventsFromDir(path.join(__dirname, 'bank'));
bindEventsFromDir(path.join(__dirname, 'update'));
bindEventsFromDir(path.join(__dirname, 'interactions'));

// ready
client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  try {
    client.user.setActivity('Top-up Service', { type: ActivityType.Playing });
  } catch {}
  // เพิ่มเพดาน listener หากโปรเจ็กต์มีหลาย handler
  client.setMaxListeners(25);
});

// slash commands dispatcher (สั้น กระทัดรัด)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand?.()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;
  try {
    await cmd.execute(interaction, client);
  } catch (e) {
    console.error(`❌ Command error [/${interaction.commandName}]:`, e);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ มีข้อผิดพลาด', ephemeral: true }).catch(() => {});
    }
  }
});

// กันโปรเซสดับจาก error ที่ไม่ถูกจับ
process.on('unhandledRejection', (err) => console.error('🚨 UnhandledRejection:', err));
process.on('uncaughtException', (err) => console.error('🚨 UncaughtException:', err));

// ปิดบอทอย่างสุภาพเมื่อได้รับสัญญาณ
const stop = async (signal) => {
  console.log(`⚠️ Received ${signal}, destroying Discord client...`);
  try { await client.destroy(); } catch {}
};
process.once('SIGINT', () => stop('SIGINT'));
process.once('SIGTERM', () => stop('SIGTERM'));

// ล็อกอิน ถ้ามีโทเคน
if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN).catch((e) => {
    console.error('❌ Discord login failed:', e);
    // ไม่ exit เพื่อให้ HTTP health อยู่ต่อ และดู log ได้
  });
}

module.exports = client;
