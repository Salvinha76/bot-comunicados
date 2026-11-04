// Corre UMA vez no teu PC (Node 18+) para criar o comando /comunicado no servidor.
const { DISCORD_TOKEN, APP_ID, GUILD_ID } = process.env;
const cmds = [{
  name: 'comunicado', description: 'Enviar um comunicado oficial em nome do bot',
  default_member_permissions: '8', dm_permission: false,
  options: [
    { type: 7, name: 'canal', description: 'Canal onde publicar', required: true, channel_types: [0, 5] },
    { type: 8, name: 'mencionar', description: 'Cargo a mencionar (opcional)', required: false }] }];
const r = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`, {
  method: 'PUT', headers: { Authorization: `Bot ${DISCORD_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
console.log(r.status, await r.text());
