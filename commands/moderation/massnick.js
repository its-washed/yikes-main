const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'massnick', description: 'Change nickname for multiple users', usage: ',massnick [nickname]' },
    aliases: ['massrename'],
    cooldown: 60,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageNicknames')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Nicknames.')] });
        const nick = args.join(' ');
        if (!nick) return message.reply({ embeds: [errorEmbed('Missing Nickname', 'Usage: ,massnick [nickname]')] });
        const members = message.mentions.members.size > 0 ? message.mentions.members : message.guild.members.cache.filter(m => !m.user.bot && m.id !== message.author.id);
        let count = 0;
        for (const [, member] of members) {
            try { await member.setNickname(nick); count++; } catch {}
        }
        return message.reply({ embeds: [successEmbed('Mass Nickname', `Changed **${count}** nicknames to **${nick}**.`)] });
    }
};
