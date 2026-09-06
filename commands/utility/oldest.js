const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'oldest', description: 'Find oldest members', usage: ',oldest [amount]' },
    aliases: ['veterans'],
    cooldown: 10,
    async execute(message, args) {
        const amount = parseInt(args[0]) || 10;
        const sorted = message.guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp).first(amount);
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Oldest Members', description: sorted.map((m, i) => `**${i + 1}.** ${m.user.tag} — <t:${Math.floor(m.joinedTimestamp / 1000)}:R>`).join('\n') })] });
    }
};
