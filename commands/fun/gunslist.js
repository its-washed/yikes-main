const { query } = require('../../utils/database');
const { warn, paginate } = require('../../utils/context');
const { blacklisted, warnMedia } = require('../../utils/media');
const { getJson } = require('../../utils/social');

module.exports = {
    data: { name: 'gunslist', description: 'List all linked guns.lol accounts', usage: ',gunslist' },
    aliases: [],
    cooldown: 10,

    execute: async (message) => {
        if (await blacklisted(message)) return;
        const rows = query('SELECT * FROM guns ORDER BY uid ASC');
        if (!rows.length) return warn(message, 'No guns.lol accounts linked');
        const content = [];
        for (const row of rows) {
            const data = await getJson(`https://api.evelina.bot/guns/uid?id=${encodeURIComponent(String(row.uid))}`);
            if (!data || data.message !== undefined) continue;
            content.push(`[**${data.username}**](https://guns.lol/${data.username}) (\`${row.uid}\`) - <@${row.user_id}>`);
        }
        if (!content.length) return warn(message, 'No valid guns.lol accounts found.');
        return paginate(message, content, 'Linked guns.lol accounts', { name: message.guild.name, icon_url: message.guild.iconURL({ size: 256 }) || undefined });
    }
};
