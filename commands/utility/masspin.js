const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'masspin', description: 'Pin multiple messages', usage: ',masspin [amount]' },
    aliases: [],
    cooldown: 30,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const amount = parseInt(args[0]) || 5;
        if (amount < 1 || amount > 25) return message.reply({ embeds: [errorEmbed('Invalid Amount', 'Must be 1-25.')] });
        const msgs = await message.channel.messages.fetch({ limit: amount + 1 });
        const toPin = msgs.filter(m => !m.pinned && m.id !== message.id).first(amount);
        let count = 0;
        for (const [, m] of toPin) {
            try { await m.pin(); count++; } catch {}
        }
        return message.reply({ embeds: [createEmbed({ color: 0x22c55e, description: `Pinned **${count}** messages.` })] });
    }
};
