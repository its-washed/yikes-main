const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'creatchannel', description: 'Create a text channel', usage: ',creatchannel [name]' },
    aliases: ['newchannel', 'createchannel'],
    cooldown: 10,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageChannels')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels.')] });
        const name = args.join('-').toLowerCase().replace(/\s+/g, '-');
        if (!name) return message.reply({ embeds: [errorEmbed('Missing Name', 'Usage: ,creatchannel [name]')] });
        const channel = await message.guild.channels.create({ name, type: 0 });
        return message.reply({ embeds: [successEmbed('Channel Created', `Created **#${channel.name}**.`)] });
    }
};
