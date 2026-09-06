const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'automodhelp', description: 'Auto moderation help', usage: ',automodhelp' },
    aliases: ['amhelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'AutoMod Help', description: 'Configure auto moderation:\n\n`,automod [setting] [value]`\n\nSettings:\n- antispam [on/off]\n- antilink [on/off]\n- badwords [on/off]\n- antiraid [on/off]\n- maxmentions [number]\n- maxlinks [number]' })] });
    }
};
