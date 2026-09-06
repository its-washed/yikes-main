const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'giveaway',
        description: 'Start a giveaway',
        usage: ',giveaway [time] [prize]'
    },
    aliases: ['gw'],
    cooldown: 60,

    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages permission.')] });
        }

        const timeStr = args[0];
        const prize = args.slice(1).join(' ');

        if (!timeStr || !prize) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,giveaway [time] [prize]\nTime: 1h, 1d, 7d')] });

        const match = timeStr.match(/^(\d+)(m|h|d|w)$/);
        if (!match) return message.reply({ embeds: [errorEmbed('Invalid Time', 'Use format like 1h, 1d, 7d, 1w.')] });

        const num = parseInt(match[1]);
        const units = { m: 60000, h: 3600000, d: 86400000, w: 604800000 };
        const ms = num * (units[match[2]] || 0);

        const msg = await message.reply({
            embeds: [createEmbed({
                color: 0xffd700,
                title: '🎉 Giveaway!',
                description: `**Prize:** ${prize}\n**Duration:** ${timeStr}\n**Host:** ${message.author}\n\nReact with 🎉 to enter!\nEnds: <t:${Math.floor((Date.now() + ms) / 1000)}:R>`
            })]
        });

        await msg.react('🎉');

        setTimeout(async () => {
            try {
                const fetched = await msg.fetch();
                const reactions = fetched.reactions.cache.get('🎉');
                const users = await reactions.users.fetch();
                const entries = users.filter(u => !u.bot);

                if (entries.size === 0) {
                    await msg.edit({ embeds: [createEmbed({ color: 0xffa502, title: 'Giveaway Ended', description: `**${prize}**\n\nNo valid entries.` })] });
                    return;
                }

                const winner = entries.random();

                await msg.edit({ embeds: [createEmbed({ color: 0x00d26a, title: '🎉 Giveaway Ended!', description: `**Prize:** ${prize}\n**Winner:** ${winner}` })] });
                await message.channel.send({ content: `Congratulations ${winner}! You won **${prize}**! 🎉` });
            } catch {}
        }, ms);
    }
};
