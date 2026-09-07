const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { loadDevData, saveDevData } = require('../../utils/developer');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: { name: 'blacklist', description: 'Manage user/server blacklists (Developer only)', usage: ',blacklist <user|server> <add|remove|list> [args]' },
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const type = args[0]?.toLowerCase();
        const action = args[1]?.toLowerCase();

        if (!type || !['user', 'server'].includes(type)) {
            return message.reply({ embeds: [errorEmbed('Usage', ',blacklist <user|server> <add|remove|list> [id]')] });
        }

        const data = loadDevData();
        const key = type === 'user' ? 'blacklist' : 'blacklistedServers';

        if (action === 'add') {
            const id = args[2] || (type === 'user' ? message.mentions.users.first()?.id : null);
            if (!id) return message.reply({ embeds: [errorEmbed('Missing ID', `Provide a ${type} ID.`)] });
            if (data[key].includes(id)) return message.reply({ embeds: [errorEmbed('Already Listed', `\`${id}\` is already blacklisted.`)] });
            data[key].push(id);
            saveDevData(data);
            return message.reply({ embeds: [successEmbed('Blacklisted', `\`${id}\` added to ${type} blacklist.`)] });
        }

        if (action === 'remove') {
            const id = args[2] || (type === 'user' ? message.mentions.users.first()?.id : null);
            if (!id) return message.reply({ embeds: [errorEmbed('Missing ID', `Provide a ${type} ID.`)] });
            if (!data[key].includes(id)) return message.reply({ embeds: [errorEmbed('Not Listed', `\`${id}\` is not blacklisted.`)] });
            data[key] = data[key].filter(x => x !== id);
            saveDevData(data);
            return message.reply({ embeds: [successEmbed('Removed', `\`${id}\` removed from ${type} blacklist.`)] });
        }

        if (action === 'list') {
            if (!data[key].length) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${type} Blacklist`, description: 'Empty.' })] });
            const pages = [];
            for (let i = 0; i < data[key].length; i += 15) {
                pages.push({
                    color: 0x6c5ce7,
                    title: `${type} Blacklist (${data[key].length})`,
                    description: data[key].slice(i, i + 15).map(id => `\`${id}\``).join('\n')
                });
            }
            return new Paginator(pages, { userId: message.author.id }).start(message.channel);
        }

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid: `add`, `remove`, `list`')] });
    }
};
