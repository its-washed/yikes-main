const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'removeafk', description: 'Remove your AFK', usage: ',removeafk' },
    aliases: ['unafk'],
    cooldown: 10,
    async execute(message) {
        const fs = require('fs');
        const path = require('path');
        const file = path.join(__dirname, '../../data/afk.json');
        if (!fs.existsSync(file)) return message.reply({ embeds: [errorEmbed('Not AFK', 'You are not AFK.')] });
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!data[message.guild.id] || !data[message.guild.id][message.author.id]) return message.reply({ embeds: [errorEmbed('Not AFK', 'You are not AFK.')] });
        delete data[message.guild.id][message.author.id];
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        try {
            const nick = message.member.nickname || message.author.username;
            if (nick.startsWith('[AFK] ')) await message.member.setNickname(nick.replace('[AFK] ', ''));
        } catch {}
        return message.reply({ embeds: [successEmbed('AFK Removed', 'You are no longer AFK.')] });
    }
};
