// deploy-commands.js
require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;
if (!DISCORD_TOKEN)      throw new Error("Missing DISCORD_TOKEN in .env");
if (!DISCORD_CLIENT_ID)  throw new Error("Missing DISCORD_CLIENT_ID (App ID) in .env");

const commands = [];
for (const f of fs.readdirSync(path.join(__dirname, "commands"))) {
  const mod = require(path.join(__dirname, "commands", f));
  if (mod?.data) commands.push(mod.data.toJSON()); // ← ส่งเป็น JSON
}

(async () => {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  const route = DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID)
    : Routes.applicationCommands(DISCORD_CLIENT_ID);

  await rest.put(route, { body: commands });
  console.log("✅ Deployed commands");
})();
