const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'serverbanner', description: "Get a user's banner for this server", usage: ',serverbanner [@user]' },
    aliases: ['sb'],
    cooldown: 3,
    async execute(message) {
        let member = message.mentions.members.first() || message.member;
        try { member = await message.guild.members.fetch(member.id); } catch {}
        const banner = member.bannerURL({ size: 1024 });
        if (!banner) return message.reply({ embeds: [errorEmbed('No Server Banner', 'This user has no banner set for this server.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${member.user.tag}'s Server Banner`, image: { url: banner } })] });
    }
};
