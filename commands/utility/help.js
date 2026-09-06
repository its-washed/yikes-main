const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'help',
        description: 'Show all commands',
        usage: ',help [command]'
    },
    aliases: ['h', 'commands'],
    cooldown: 5,

    async execute(message, args, client) {
        if (args[0]) {
            const cmd = client.commands.get(args[0].toLowerCase()) || client.commands.get(client.aliases.get(args[0].toLowerCase()));
            if (!cmd) {
                return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Command Not Found', description: `No command found named \`${args[0]}\`.` })] });
            }

            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: cmd.data.name,
                    fields: [
                        { name: 'Description', value: cmd.data.description, inline: false },
                        { name: 'Usage', value: `\`${cmd.data.usage}\``, inline: false },
                        { name: 'Aliases', value: cmd.aliases?.length ? cmd.aliases.map(a => `\`${a}\``).join(', ') : 'None', inline: true },
                        { name: 'Cooldown', value: `${cmd.cooldown || 3}s`, inline: true }
                    ]
                })]
            });
        }

        const categories = {};
        client.commands.forEach(cmd => {
            const path = cmd.data.name;
            let category = 'Other';
            if (client.commands.get(path)) {
                const filePath = require.resolve(`./${path}.js`).replace(/\\/g, '/');
                if (filePath.includes('/moderation/')) category = 'Moderation';
                else if (filePath.includes('/server/')) category = 'Server';
                else if (filePath.includes('/utility/')) category = 'Utility';
                else if (filePath.includes('/fun/')) category = 'Fun';
            }
            if (!categories[category]) categories[category] = [];
            categories[category].push(cmd);
        });

        const categoryEmojis = {
            'Moderation': '🛡️',
            'Server': '⚙️',
            'Utility': '🔧',
            'Fun': '🎮',
            'Other': '📦'
        };

        const fields = Object.entries(categories).map(([name, cmds]) => ({
            name: `${categoryEmojis[name] || '📦'} ${name} (${cmds.length})`,
            value: cmds.map(c => `\`${c.data.name}\``).join(', '),
            inline: false
        }));

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Yikes Commands',
                description: `All commands use the prefix \`,\`\nTotal commands: **${client.commands.size}**`,
                fields
            })]
        });
    }
};
