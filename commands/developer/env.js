const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: { name: 'env', description: 'View environment variables (Developer only)', usage: ',env [key]' },
    aliases: ['envvar'],
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        if (args[0]) {
            const key = args[0];
            const value = process.env[key];
            if (value === undefined) return message.reply({ embeds: [errorEmbed('Not Found', `\`${key}\` is not set.`)] });
            const display = value.length > 1800 ? value.slice(0, 1800) + '...' : value;
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `ENV: ${key}`, description: `\`\`\`\n${display}\n\`\`\`` })] });
        }

        const keys = Object.keys(process.env).sort();
        const list = keys.map(k => `\`${k}\``).join(', ');
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Environment Variables (${keys.length})`, description: list.length > 4000 ? list.slice(0, 4000) + '...' : list })] });
    }
};
