const { warn, approve } = require('../../utils/context');
const { first, run } = require('../../utils/database');

function resolveChannel(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.channels.first();
    if (mentioned && raw.includes(mentioned.id)) return mentioned;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    return message.guild.channels.cache.find(c => c.name.toLowerCase() === raw.toLowerCase()) || null;
}

module.exports = {
    data: { name: 'quotechannel', description: 'Set or remove a default quote channel', usage: ',quotechannel [#channel]' },
    aliases: ['qc'],
    cooldown: 5,

    async execute(message, args) {
        const existing = first('SELECT channel_id FROM quotes WHERE guild_id = ?', message.guild.id);

        if (!args.length) {
            if (existing) {
                run('DELETE FROM quotes WHERE guild_id = ?', message.guild.id);
                return approve(message, 'Removed the default quote channel.');
            }
            return warn(message, 'This server does not have a quote channel set.');
        }

        const channel = resolveChannel(message, args.join(' '));
        if (!channel) return warn(message, `Channel **${args.join(' ')}** couldn't be found`);

        if (existing) {
            run('UPDATE quotes SET channel_id = ? WHERE guild_id = ?', channel.id, message.guild.id);
            return approve(message, `Updated the default quote channel to ${channel}.`);
        }
        run('INSERT INTO quotes (guild_id, channel_id) VALUES (?, ?)', message.guild.id, channel.id);
        return approve(message, `Set ${channel} as the default quote channel.`);
    }
};
