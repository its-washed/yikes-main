const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'usage', description: 'Show command usage', usage: ',usage [command]' },
    aliases: ['cmdusage'],
    cooldown: 3,
    async execute(message, args) {
        const name = args[0];
        if (!name) return message.reply({ embeds: [errorEmbed('Missing Command', 'Usage: ,usage [command]')] });
        const cmd = message.client.commands.get(name) || message.client.commands.find(c => c.aliases && c.aliases.includes(name));
        if (!cmd) return message.reply({ embeds: [errorEmbed('Not Found', 'Command not found.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Usage — ${cmd.data.name}`, description: `**${cmd.data.usage}**\n\nAliases: ${cmd.aliases.length > 0 ? cmd.aliases.join(', ') : 'None'}\nCooldown: ${cmd.cooldown}s` })] });
    }
};
