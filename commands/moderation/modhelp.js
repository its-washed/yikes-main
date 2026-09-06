const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'modhelp', description: 'Moderation help', usage: ',modhelp' },
    aliases: ['mhelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Moderation Help', description: '`,ban [@user] [reason]`\n`,unban [userId]`\n`,kick [@user] [reason]`\n`,mute [@user] [duration]`\n`,unmute [@user]`\n`,warn [@user] [reason]`\n`,warnings [@user]`\n`,clearwarn [@user] [id]`\n`,purge [amount]`\n`,lock [#channel]`\n`,unlock [#channel]`\n`,nuke`' })] });
    }
};
