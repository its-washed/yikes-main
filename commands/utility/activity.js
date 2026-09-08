const { createEmbed } = require('../../utils/embeds');
const { getUserActivity } = require('../../utils/activity');

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m ${seconds % 60}s`;
}

module.exports = {
    data: { name: 'activity', description: 'View your activity stats', usage: ',activity [@user]' },
    aliases: ['stats'],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const activity = getUserActivity(message.guild.id, target.id);

        const totalMs = activity.vcTime + (activity.lastVCJoin > 0 ? Date.now() - activity.lastVCJoin : 0);

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `${target.tag}'s Activity`,
                thumbnail: { url: target.displayAvatarURL({ dynamic: true }) },
                fields: [
                    { name: 'Messages', value: `${activity.messages.toLocaleString()}`, inline: true },
                    { name: 'VC Time', value: formatDuration(totalMs), inline: true },
                    { name: 'In VC Now', value: activity.lastVCJoin > 0 ? 'Yes' : 'No', inline: true }
                ]
            })]
        });
    }
};
