const { Events } = require('discord.js');
const { query, run } = require('../utils/database');
const { altConvert, scriptPayload } = require('../utils/embedScript');

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        const tick = async () => {
            const now = Date.now() / 1000;

            try {
                const dueReminders = query('SELECT * FROM reminder WHERE remind_time <= ?', now);
                for (const rem of dueReminders) {
                    try {
                        const channel = client.channels.cache.get(rem.channel_id);
                        if (channel) {
                            const me = channel.guild && channel.guild.members.me;
                            const canSend = channel.permissionsFor && me ? channel.permissionsFor(me) : null;
                            if (!canSend || (canSend.has('SendMessages') && canSend.has('EmbedLinks'))) {
                                await channel.send(`🕐 <@${rem.user_id}> - ${rem.task}`).catch(() => {});
                            }
                        }
                    } catch (err) {}
                    try {
                        run('DELETE FROM reminder WHERE guild_id = ? AND user_id = ? AND channel_id = ? AND remind_time = ?',
                            rem.guild_id, rem.user_id, rem.channel_id, rem.remind_time);
                    } catch (err) {}
                }
            } catch (err) {}

            try {
                const dueBumps = query('SELECT * FROM bumpreminder WHERE time IS NOT NULL AND time <= ? AND channel_id IS NOT NULL', now);
                for (const row of dueBumps) {
                    try {
                        const channel = client.channels.cache.get(row.channel_id);
                        if (channel) {
                            const payload = scriptPayload(altConvert(channel.guild.members.me || client.user, row.reminder));
                            if (payload.content || payload.embeds) {
                                await channel.send(payload).catch(() => {});
                            }
                        }
                    } catch (err) {}
                    try {
                        run('UPDATE bumpreminder SET time = ? WHERE guild_id = ?', now + 7200, row.guild_id);
                    } catch (err) {}
                }
            } catch (err) {}

            try {
                const due = query('SELECT channel_id, code, guild_id FROM timer WHERE time + "interval" <= ?', now);
                for (const row of due) {
                    try {
                        const channel = client.channels.cache.get(row.channel_id);
                        if (!channel) continue;
                        const owner = channel.guild.members.cache.get(channel.guild.ownerId) || channel.guild.members.me;
                        const payload = scriptPayload(altConvert(owner, row.code));
                        if (payload.content || payload.embeds) {
                            await channel.send(payload).catch(() => {});
                        }
                        run('UPDATE timer SET time = ? WHERE channel_id = ?', now, row.channel_id);
                    } catch (err) {}
                }
            } catch (err) {}
        };
        setTimeout(tick, 15000);
        setInterval(tick, 15000);
    }
};
