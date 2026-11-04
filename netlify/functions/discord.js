// Bot de comunicados (slash command) - corre como função no Netlify, sem precisar de ficar ligado.
const crypto = require('crypto');
const API = 'https://discord.com/api/v10';
const resp = (o) => ({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
const msg = (t) => resp({ type: 4, data: { content: t, flags: 64 } });

exports.handler = async (event) => {
  // 1) verificar que o pedido vem mesmo do Discord
  const sig = event.headers['x-signature-ed25519'], ts = event.headers['x-signature-timestamp'];
  const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body;
  let ok = false;
  try {
    const key = crypto.createPublicKey({
      key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(process.env.DISCORD_PUBLIC_KEY, 'hex')]),
      format: 'der', type: 'spki' });
    ok = crypto.verify(null, Buffer.from(ts + body), key, Buffer.from(sig, 'hex'));
  } catch (e) {}
  if (!ok) return { statusCode: 401, body: 'invalid request signature' };

  const i = JSON.parse(body);
  if (i.type === 1) return resp({ type: 1 }); // ping do Discord

  // 2) só cargos autorizados (opcional): ALLOWED_ROLE_IDS=id1,id2
  const allowed = (process.env.ALLOWED_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  const roles = (i.member && i.member.roles) || [];
  if (allowed.length && !roles.some(r => allowed.includes(r))) return msg('Não tens permissão para usar este comando.');

  // 3) /comunicado -> abre a janela para escrever título e texto
  if (i.type === 2 && i.data.name === 'comunicado') {
    const o = Object.fromEntries((i.data.options || []).map(x => [x.name, x.value]));
    return resp({ type: 9, data: {
      custom_id: `com:${o.canal}:${o.mencionar || 0}`, title: 'Novo comunicado',
      components: [
        { type: 1, components: [{ type: 4, custom_id: 'titulo', label: 'Título', style: 1, max_length: 200, required: true }] },
        { type: 1, components: [{ type: 4, custom_id: 'texto', label: 'Mensagem', style: 2, max_length: 4000, required: true }] }] } });
  }

  // 4) janela submetida -> o bot publica o embed com friso dourado
  if (i.type === 5 && i.data.custom_id.startsWith('com:')) {
    const [, canal, role] = i.data.custom_id.split(':');
    const v = {}; i.data.components.forEach(r => r.components.forEach(c => { v[c.custom_id] = c.value; }));
    const embed = { title: v.titulo, description: v.texto, color: 0xC9B06E,
      footer: { text: 'PSP Viseu RP | Comunicado Oficial' }, timestamp: new Date().toISOString() };
    if (process.env.LOGO_URL) embed.thumbnail = { url: process.env.LOGO_URL };
    const payload = { embeds: [embed], allowed_mentions: { parse: [], roles: role !== '0' ? [role] : [] } };
    if (role !== '0') payload.content = `<@&${role}>`;
    const r = await fetch(`${API}/channels/${canal}/messages`, { method: 'POST',
      headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return msg(r.ok ? '✅ Comunicado enviado.' : '❌ Não conseguiu enviar. Confirma se o bot tem acesso a esse canal.');
  }
  return msg('Comando desconhecido.');
};
