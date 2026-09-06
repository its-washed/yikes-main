const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'tempban',
        description: 'Temporarily ban a user',
        usage: ',tempban [@user] [duration] [reason]'
    },
    aliases: ['tban'],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has('BanMembers')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Ban Members permission.')] });
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,tempban [@user] [time] [reason]')] });

        const duration = args[1];
        if (!duration) return message.reply({ embeds: [errorEmbed('Missing Duration', 'Provide duration (e.g., 1h, 1d, 7d).')] });

        const timeMs = parseDuration(duration);
        if (!timeMs) return message.reply({ embeds: [errorEmbed('Invalid Duration', 'Use format like 1h, 1d, 7d, etc.')] });

        const reason = args.slice(2).join(' ') || 'No reason provided';

        await target.ban({ reason });

        return message.reply({
            embeds: [createEmbed({
                color: 0xff4757,
                title: 'Temporarily Banned',
                description: `**${target.user.tag}** banned for **${duration}**.\nReason: ${reason}`
            })]
        });
    }
};

function parseDuration(str) {
    const match = str.match(/^(\d+)(m|h|d|w)$/);
    if (!match) return null;
    const num = parseInt(match[1]);
    const units = { m: 60000, h: 3600000, d: 86400000, w: 604800000 };
    return num * (units[match[2]] || 0);
}
