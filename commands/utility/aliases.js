const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'aliases', description: 'Show command aliases', usage: ',aliases [command]' },
    aliases: ['cmdaliases'],
    cooldown: 3,
    async execute(message, args) {
        const name = args[0];
        if (!name) return message.reply({ embeds: [errorEmbed('Missing Command', 'Usage: ,aliases [command]')] });
        const cmd = message.client.commands.get(name) || message.client.commands.find(c => c.aliases && c.aliases.includes(name));
        if (!cmd) return message.reply({ embeds: [errorEmbed('Not Found', 'Command not found.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Aliases — ${cmd.data.name}`, description: cmd.aliases.length > 0 ? cmd.aliases.map(a => `\`${a}\``).join(', ') : 'No aliases' })] });
    }
};
