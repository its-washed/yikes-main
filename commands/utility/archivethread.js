const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'archivethread', description: 'Archive a thread', usage: ',archivethread [#thread]' },
    aliases: ['at'],
    cooldown: 10,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageThreads')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Threads.')] });
        const thread = message.mentions.channels.first() || message.channel;
        if (!thread.isThread()) return message.reply({ embeds: [errorEmbed('Not a Thread', 'That is not a thread.')] });
        try {
            await thread.setArchived(true);
            return message.reply({ embeds: [successEmbed('Thread Archived', `Archived **${thread.name}**.`)] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not archive thread.')] }); }
    }
};
