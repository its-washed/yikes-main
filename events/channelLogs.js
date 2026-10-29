const { Events, ChannelType } = require('discord.js');
const { logChannelCreate, logChannelDelete, logChannelUpdate } = require('../utils/logging');
const { first, run } = require('../utils/database');

module.exports = [
    {
        name: Events.ChannelCreate,
        once: false,
        execute(channel) { logChannelCreate(channel); }
    },
    {
        name: Events.ChannelDelete,
        once: false,
        execute(channel) {
            logChannelDelete(channel);

            if (channel.type === ChannelType.GuildText && channel.guild) {
                for (const table of ['automod_spam', 'automod_repeat']) {
                    try {
                        const row = first(`SELECT channels FROM ${table} WHERE guild_id = ?`, channel.guild.id);
                        if (!row || !row.channels) continue;
                        const list = JSON.parse(row.channels);
                        if (Array.isArray(list) && list.map(String).includes(String(channel.id))) {
                            run(`UPDATE ${table} SET channels = ? WHERE guild_id = ?`,
                                JSON.stringify(list.filter(id => String(id) !== String(channel.id))), channel.guild.id);
                        }
                    } catch (err) {}
                }
            }
        }
    },
    {
        name: Events.ChannelUpdate,
        once: false,
        execute(oldChannel, newChannel) { logChannelUpdate(oldChannel, newChannel); }
    }
];
