const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'announce',
        description: 'Create an announcement embed',
        usage: ',announce [channel] [title] | [message]'
    },
    aliases: ['announcement'],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages permission.')] });
        }

        const channel = message.mentions.channels.first();
        if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Usage: ,announce [#channel] [title] | [message]')] });

        const content = args.slice(1).join(' ');
        const parts = content.split('|').map(p => p.trim());
        const title = parts[0];
        const description = parts.slice(1).join(' | ');

        if (!title) return message.reply({ embeds: [errorEmbed('Missing Title', 'Provide a title and description.')] });

        await channel.send({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: title,
                description: description,
                footer: { text: `Announcement by ${message.author.tag}` },
                timestamp: new Date().toISOString()
            })]
        });

        return message.reply({ embeds: [successEmbed('Announcement Sent', `Sent to ${channel}.`)] });
    }
};
