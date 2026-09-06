const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { getLevelData, addXP } = require('../../utils/levels');

module.exports = {
    data: {
        name: 'rank',
        description: 'Check your rank and level',
        usage: ',rank [@user]'
    },
    aliases: ['level', 'xp', 'rankcard'],
    cooldown: 5,

    async execute(message, args, client, config) {
        const member = message.mentions.members.first() || message.member;
        const data = getLevelData(message.guild.id, member.id);

        const xpNeeded = data.level * data.level * 100;
        const progress = data.xp / xpNeeded;
        const barLength = 20;
        const filled = Math.round(progress * barLength);
        const bar = '█'.repeat(Math.min(filled, barLength)) + '░'.repeat(Math.max(barLength - filled, 0));

        const globalRank = getGlobalRank(message.guild.id, member.id);

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Rank — ${member.user.tag}`,
                thumbnail: { url: member.user.displayAvatarURL({ dynamic: true }) },
                fields: [
                    { name: 'Level', value: `${data.level}`, inline: true },
                    { name: 'XP', value: `${data.xp} / ${xpNeeded}`, inline: true },
                    { name: 'Total XP', value: `${data.totalXp}`, inline: true },
                    { name: 'Messages', value: `${data.messages}`, inline: true },
                    { name: 'Server Rank', value: `#${globalRank}`, inline: true },
                    { name: 'Progress', value: `\`${bar}\``, inline: false }
                ]
            })]
        });
    }
};

function getGlobalRank(guildId, userId) {
    const { getAllLevelData } = require('../../utils/levels');
    const all = getAllLevelData(guildId);
    const sorted = Object.entries(all).sort((a, b) => (b[1].totalXp || 0) - (a[1].totalXp || 0));
    const idx = sorted.findIndex(([id]) => id === userId);
    return idx >= 0 ? idx + 1 : sorted.length + 1;
}
