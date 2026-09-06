const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'createthread', description: 'Create a thread', usage: ',createthread [name]' },
    aliases: ['ct'],
    cooldown: 10,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageThreads')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Threads.')] });
        const name = args.join(' ');
        if (!name) return message.reply({ embeds: [errorEmbed('Missing Name', 'Usage: ,createthread [name]')] });
        try {
            const thread = await message.channel.threads.create({ name, autoArchiveDuration: 60, reason: `Created by ${message.author.tag}` });
            return message.reply({ embeds: [successEmbed('Thread Created', `Created thread **${thread.name}**.`)] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not create thread.')] }); }
    }
};
