const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'timeoutlist', description: 'List timed out members', usage: ',timeoutlist' },
    aliases: ['tml'],
    cooldown: 10,
    async execute(message) {
        const timed = message.guild.members.cache.filter(m => m.isCommunicationDisabled());
        if (timed.size === 0) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, description: 'No timed out members.' })] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Timed Out (${timed.size})`, description: timed.map(m => `${m.user.tag} — <t:${Math.floor(m.communicationDisabledUntilTimestamp / 1000)}:R>`).join('\n') })] });
    }
};
