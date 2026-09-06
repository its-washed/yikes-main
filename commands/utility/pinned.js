const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'pinned', description: 'List pinned messages', usage: ',pinned' },
    aliases: ['pins'],
    cooldown: 5,
    async execute(message) {
        const pins = await message.channel.messages.fetchPinned();
        if (pins.size === 0) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, description: 'No pinned messages.' })] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Pinned Messages (${pins.size})`, description: pins.map(m => `**${m.author.tag}:** ${m.content.slice(0, 100)}`).join('\n').slice(0, 2000) })] });
    }
};
