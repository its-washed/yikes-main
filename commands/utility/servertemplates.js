const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'servertemplates', description: 'Get server templates', usage: ',servertemplates' },
    aliases: ['templates'],
    cooldown: 10,
    async execute(message) {
        const templates = await message.guild.fetchTemplates();
        if (templates.size === 0) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, description: 'No templates found.' })] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Templates (${templates.size})`, description: templates.map(t => `**${t.name}** — ${t.description || 'No description'}`).join('\n') })] });
    }
};
