module.exports = (client) => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setPresence({ activities: [{ name: "Top-up Center" }], status: "online" });
};