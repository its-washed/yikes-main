const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'fakeban', description: 'Fake ban someone', usage: ',fakeban [@user] [reason]' },
    aliases: ['bann'],
    cooldown: 5,
    async execute(message, args) {
        const target = message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user;
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,fakeban [@user] [reason]')] });
        if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('Invalid', 'You cannot fake ban yourself.')] });
        if (target.bot) return message.reply({ embeds: [errorEmbed('Invalid', 'You cannot fake ban bots.')] });

        const reason = args.slice(1).join(' ') || 'No reason provided';

        const loading = await message.reply({
            embeds: [createEmbed({ color: 0xffa502, title: 'Banning...', description: `Banning **${target.tag}**...` })]
        });

        await new Promise(r => setTimeout(r, 2000));

        return loading.edit({
            embeds: [createEmbed({
                color: 0xff4757,
                title: 'User Banned',
                description: `**${target.tag}** has been banned from **${message.guild.name}**.\n\n**Reason:** ${reason}\n**Banned by:** ${message.author.tag}`
            })]
        });
    }
};
