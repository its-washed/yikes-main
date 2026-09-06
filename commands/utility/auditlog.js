const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'auditlog', description: 'View audit log', usage: ',auditlog [amount]' },
    aliases: ['alog'],
    cooldown: 10,
    async execute(message, args) {
        if (!message.member.permissions.has('ViewAuditLog')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need View Audit Log.')] });
        const amount = parseInt(args[0]) || 10;
        const logs = await message.guild.fetchAuditLogs({ limit: amount });
        const entries = logs.entries.first(amount);
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Audit Log (${entries.size})`, description: entries.map(e => `**${e.action}** by ${e.executor?.tag || 'Unknown'}`).join('\n').slice(0, 2000) })] });
    }
};
