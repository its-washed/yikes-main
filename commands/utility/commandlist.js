const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { replyPaginated } = require('../../utils/pagination');

module.exports = {
    data: { name: 'commandlist', description: 'List all commands by category', usage: ',commandlist [category]' },
    aliases: ['cl', 'cmds'],
    cooldown: 5,
    async execute(message, args) {
        const groups = {};
        message.client.commands.forEach(cmd => {
            const cat = cmd.category || 'other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(cmd);
        });

        if (args[0]) {
            const cat = args[0].toLowerCase();
            if (!groups[cat]) {
                const available = Object.keys(groups).sort().join(', ');
                return message.reply({ embeds: [errorEmbed('Unknown Category', `Valid categories: ${available}`)] });
            }
            const lines = groups[cat].map(c => `\`${c.data.name}\` — ${c.data.description}`);
            const pages = [];
            let current = '';
            for (const line of lines) {
                if ((current + line + '\n').length > 3900) {
                    pages.push(current);
                    current = `${line}\n`;
                } else {
                    current += `${line}\n`;
                }
            }
            if (current) pages.push(current);

            const label = cat.charAt(0).toUpperCase() + cat.slice(1);
            const embeds = pages.map(page => ({
                color: 0x6c5ce7,
                title: `${label} Commands (${groups[cat].length})`,
                description: page,
                timestamp: new Date().toISOString()
            }));
            return replyPaginated(message, embeds);
        }

        const summary = Object.keys(groups).sort().map(cat => `**${cat.charAt(0).toUpperCase() + cat.slice(1)}**: ${groups[cat].length} commands`).join('\n');
        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Command List',
                description: `Total: **${message.client.commands.size}** commands in **${Object.keys(groups).length}** categories\n\n${summary}\n\nUse \`<category>\` to list commands in a category.`
            })]
        });
    }
};
