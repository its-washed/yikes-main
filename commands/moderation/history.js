const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'history',
        description: 'View moderation history for a user',
        usage: ',history [@user]'
    },
    aliases: ['modhistory', 'casehistory'],
    cooldown: 5,

    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Moderation History — ${target.tag}`,
                description: '*Moderation history database not connected.*\n\nIntegrate with a database to track warns, mutes, bans, etc.'
            })]
        });
    }
};
