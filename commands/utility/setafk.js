const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'setafk', description: 'Set AFK status', usage: ',setafk [reason]' },
    aliases: ['afkset'],
    cooldown: 10,
    async execute(message, args) {
        const reason = args.join(' ') || 'AFK';
        const fs = require('fs');
        const path = require('path');
        const file = path.join(__dirname, '../../data/afk.json');
        let data = {};
        if (fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!data[message.guild.id]) data[message.guild.id] = {};
        data[message.guild.id][message.author.id] = { reason, timestamp: Date.now() };
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        try { await message.member.setNickname(`[AFK] ${message.member.nickname || message.author.username}`); } catch {}
        return message.reply({ embeds: [successEmbed('AFK Set', `You are now AFK: **${reason}**`)] });
    }
};
