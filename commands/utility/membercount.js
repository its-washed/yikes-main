const { createEmbed, COLORS } = require('../../utils/embeds');

module.exports = {
    data: { name: 'membercount', description: 'View server member count', usage: ',membercount [invite]' },
    aliases: ['mc'],
    cooldown: 3,
    async execute(message, args, client) {
        const guild = message.guild;

        if (args[0]) {
            const invite = await client.fetchInvite(args[0]).catch(() => null);
            if (invite) {
                const embed = createEmbed({
                    color: COLORS.NEUTRAL,
                    description: `> **members:** ${Number(invite.approximateMemberCount || 0).toLocaleString('en-US')}`,
                    author: {
                        name: `${invite.guild.name}'s statistics`,
                        icon_url: invite.guild.iconURL({ size: 256 }) || undefined
                    }
                });
                return message.reply({ embeds: [embed] });
            }
        }

        const members = guild.members.cache;
        const humans = new Set(members.filter(m => !m.bot).map(m => m.id)).size;
        const bots = new Set(members.filter(m => m.bot).map(m => m.id)).size;
        const joinedToday = members.filter(m => m.joinedTimestamp && Date.now() - m.joinedTimestamp < 3600 * 24 * 1000).size;

        const embed = createEmbed({
            color: COLORS.NEUTRAL,
            description: `>>> **humans** - ${humans.toLocaleString('en-US')}\n**bots** - ${bots.toLocaleString('en-US')}\n**total** - ${guild.memberCount.toLocaleString('en-US')}`,
            author: {
                name: `${guild.name}'s statistics (+${joinedToday})`,
                icon_url: guild.iconURL({ size: 256 }) || undefined
            }
        });
        return message.reply({ embeds: [embed] });
    }
};
