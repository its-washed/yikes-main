const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, formatTimespan } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');
const { parseTime } = require('../../utils/context');

const MAX_DURATION = 6 * 60 * 60;

module.exports = {
    permission: "manage channels",
    data: { name: 'slowmode', description: 'Enable slowmode option in a text channel', usage: ',slowmode <time> [channel]' },
    aliases: ['cooldown'],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;

        if (!args[0]) {
            return warn(message, 'Usage: `slowmode <time> [channel]`');
        }

        const time = parseTime(args[0]);
        if (time === null) {
            return warn(message, `**${args[0]}** is an invalid timespan`);
        }
        if (time > MAX_DURATION) {
            return warn(message, "You can't set a slowmode for more than **6 hours**");
        }

        let channel = message.channel;
        if (args[1]) {
            const id = String(args[1]).replace(/[<#>]/g, '');
            channel = message.guild.channels.cache.get(id) || null;
            if (!channel) return warn(message, `No channel named \`${args[1]}\` found`);
        }

        await channel.setRateLimitPerUser(time, `Slowmode invoked by ${message.author}`).catch(() => {});
        return approve(message, `Slowmode for ${channel} set to **${formatTimespan(time)}**`);
    }
};
