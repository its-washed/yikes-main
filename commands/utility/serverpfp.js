const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'serverpfp', description: "Get a user's avatar for this server", usage: ',serverpfp [@user]' },
    aliases: ['sav'],
    cooldown: 3,
    async execute(message) {
        let member = message.mentions.members.first() || message.member;
        try { member = await message.guild.members.fetch(member.id); } catch {}
        const avatar = member.avatarURL({ size: 1024 });
        if (!avatar) return message.reply({ embeds: [errorEmbed('No Server Avatar', 'This user has no avatar set for this server.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${member.user.tag}'s Server Avatar`, image: { url: avatar } })] });
    }
};
