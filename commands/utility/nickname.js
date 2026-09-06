const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'nickname', description: 'Set your own nickname', usage: ',nickname [name]' },
    aliases: ['setnick'],
    cooldown: 30,
    async execute(message, args) {
        const nick = args.join(' ');
        if (!nick) return message.reply({ embeds: [errorEmbed('Missing Name', 'Usage: ,nickname [name]')] });
        try {
            await message.member.setNickname(nick);
            return message.reply({ embeds: [createEmbed({ color: 0x22c55e, description: `Nickname set to **${nick}**.` })] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not change nickname.')] }); }
    }
};
