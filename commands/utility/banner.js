const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'banner', description: "Get the banner of a member or yourself", usage: ',banner its_washed', params: ['[user]'] },
    aliases: [],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        let user = target;
        try { user = await target.fetch(); } catch {}
        const banner = user.bannerURL({ size: 1024 });
        if (!banner) return message.reply({ embeds: [errorEmbed('No Banner', 'This user has no banner.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x729bb0, title: `${user.tag}'s Banner`, image: { url: banner } })] });
    }
};
