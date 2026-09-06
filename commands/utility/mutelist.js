const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'mutelist', description: 'List muted members', usage: ',mutelist' },
    aliases: ['ml'],
    cooldown: 10,
    async execute(message) {
        const muted = message.guild.members.cache.filter(m => m.isCommunicationDisabled());
        if (muted.size === 0) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, description: 'No muted members.' })] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Muted (${muted.size})`, description: muted.map(m => `${m.user.tag} — <t:${Math.floor(m.communicationDisabledUntilTimestamp / 1000)}:R>`).join('\n') })] });
    }
};
