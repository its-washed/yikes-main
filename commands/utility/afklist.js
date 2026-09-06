const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'afklist', description: 'View AFK users', usage: ',afklist' },
    aliases: ['afks'],
    cooldown: 5,
    async execute(message) {
        const fs = require('fs');
        const path = require('path');
        const file = path.join(__dirname, '../../data/afk.json');
        if (!fs.existsSync(file)) return message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: 'No AFK users.' })] });
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const guild = data[message.guild.id];
        if (!guild || Object.keys(guild).length === 0) return message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: 'No AFK users.' })] });
        const list = Object.entries(guild).map(([id, info]) => {
            const mins = Math.floor((Date.now() - info.timestamp) / 60000);
            return `<@${id}> — ${info.reason} (${mins}m ago)`;
        }).join('\n');
        return message.reply({ embeds: [createEmbed({ color: 0xfbbf24, title: 'AFK Users', description: list })] });
    }
};
