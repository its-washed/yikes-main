const { Events } = require('discord.js');
const { query, first, run } = require('../utils/database');
const { COLORS } = require('../utils/styles');

const RESTORE_TABLES = ['welcome', 'leave', 'boost', 'nuke_scheduler', 'stickymessage', 'channel_disabled_commands', 'channel_disabled_module'];

async function tick(client) {
    const rows = query('SELECT * FROM nuke_scheduler');
    if (!rows.length) return;
    const now = Date.now() / 1000;
    for (const row of rows) {
        const schedule = Number(row.schedule) || 0;
        const lastNuke = Number(row.last_nuke) || 0;
        if (!schedule) continue;
        if (now < lastNuke + schedule) continue;

        const guild = client.guilds.cache.get(String(row.guild_id));
        if (!guild) continue;
        const channel = guild.channels.cache.get(String(row.channel_id));
        if (!channel) continue;

        try {
            run('UPDATE nuke_scheduler SET last_nuke = ? WHERE guild_id = ? AND channel_id = ?', now, row.guild_id, row.channel_id);

            const newChannel = await channel.clone({ reason: 'Nuke Schedule: channel nuked' });
            await newChannel.setPosition(channel.position).catch(() => {});

            const restored = [];
            for (const table of RESTORE_TABLES) {
                const exists = first(`SELECT 1 AS ok FROM ${table} WHERE guild_id = ? AND channel_id = ?`, guild.id, channel.id);
                if (exists) {
                    run(`UPDATE ${table} SET channel_id = ? WHERE guild_id = ? AND channel_id = ?`, newChannel.id, guild.id, channel.id);
                    restored.push(`- restored ${table.replace(/_/g, ' ')} setup`);
                }
            }

            await channel.delete('Nuke Schedule: channel nuked').catch(() => {});

            const embed = { color: COLORS.NEUTRAL, description: '### 💣 Channel nuked by schedule' };
            if (restored.length) {
                embed.fields = [{ name: 'Restored Setups', value: restored.join('\n'), inline: false }];
            }
            await newChannel.send({ embeds: [embed] }).catch(() => {});

            run('UPDATE nuke_scheduler SET channel_id = ? WHERE guild_id = ? AND channel_id = ?', newChannel.id, guild.id, row.channel_id);
        } catch (err) {
            continue;
        }
    }
}

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        setTimeout(() => tick(client).catch(() => {}), 10000);
        setInterval(() => tick(client).catch(() => {}), 60000);
    }
};
