const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'boostrole', description: 'Customize your booster role', usage: ',boostrole [color/name]' },
    aliases: ['brole'],
    cooldown: 30,
    async execute(message, args) {
        const member = message.member;
        if (!member.premiumSince) return message.reply({ embeds: [errorEmbed('Not a Booster', 'You need to be a server booster.')] });
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Boost Role', description: 'Customize your booster role:\n\n`,boostrole color [hex]`\n`,boostrole name [name]`\n\nRequires boost level 2+ for icons.' })] });
    }
};
