const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'commandlist', description: 'List all commands by category', usage: ',commandlist [category]' },
    aliases: ['cl', 'cmds'],
    cooldown: 5,
    async execute(message, args) {
        const categories = {};
        message.client.commands.forEach(cmd => {
            const cat = cmd.data.name;
            if (!categories[cat]) categories[cat] = [];
        });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Command List', description: `Total: **${message.client.commands.size}** commands\n\nUse `,help` for detailed command info.` })] });
    }
};
