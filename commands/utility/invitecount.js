const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'invitecount', description: 'Count server invites', usage: ',invitecount' },
    aliases: ['invcount'],
    cooldown: 10,
    async execute(message) {
        const invites = await message.guild.invites.fetch();
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Invite Count', description: `**${invites.size}** invites found.` })] });
    }
};
