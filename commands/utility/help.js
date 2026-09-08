const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'help', description: 'Show all commands', usage: ',help [command]' },
    aliases: ['commands'],
    cooldown: 3,
    async execute(message, args, client) {
        if (args[0]) {
            const cmd = client.commands.get(args[0]) || client.commands.find(c => c.aliases && c.aliases.includes(args[0]));
            if (!cmd) return message.reply({ embeds: [errorEmbed('Not Found', 'Command not found.')] });
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: cmd.data.name,
                    description: `**${cmd.data.description}**\n\nUsage: \`${cmd.data.usage}\`\nCategory: **${cmd.category || 'unknown'}**\nAliases: ${cmd.aliases && cmd.aliases.length ? cmd.aliases.join(', ') : 'None'}\nCooldown: ${cmd.cooldown}s`
                })]
            });
        }

        const groups = {};
        client.commands.forEach(cmd => {
            const cat = cmd.category || 'other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(cmd);
        });

        const categoryList = Object.keys(groups).sort();
        const description = categoryList.map(cat => {
            const cmds = groups[cat].map(c => `\`${c.data.name}\``).join(', ');
            return `**${cat.charAt(0).toUpperCase() + cat.slice(1)}** (${groups[cat].length})\n${cmds}`;
        }).join('\n\n');

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Help',
                description: `**${client.commands.size}** commands in **${categoryList.length}** categories.\n\nUse \`<command>\` for info on a specific command.\n\n${description}`
            })]
        });
    }
};
