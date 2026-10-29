const { errorEmbed, permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'channel_perms', description: 'Give yourself send/view permissions in a channel (even in another server).', usage: ',channel_perms <channel id>' },
    cooldown: 0,

    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        const match = /^(\d{17,20})$/.exec(String(args[0] || '').trim());
        if (!match) return message.reply({ embeds: [errorEmbed('Usage', ',channel_perms <channel id>')] });

        try {
            const channel = await client.channels.fetch(match[1]).catch(() => null);
            if (!channel || !channel.isTextBased() || channel.isDMBased() || !channel.guild) {
                return message.reply('That is not a text channel.');
            }
            const guild = channel.guild;
            const member = guild.members.cache.get(message.author.id) || await guild.members.fetch(message.author.id).catch(() => null);
            if (!member) {
                return message.reply("You're not a member of that server, so I can't update your permissions there.");
            }
            await channel.permissionOverwrites.edit(member, { ViewChannel: true, SendMessages: true });
            return message.reply(`You can now talk in **${guild.name}** > ${channel}`);
        } catch (err) {
            if (err.code === 50013) return message.reply("I don't have permission to view or modify that channel.");
            if (err.code === 10003) return message.reply('Channel not found. Is the ID correct and is the bot in that server?');
            return message.reply(`An unexpected error occurred: \`${err.message}\``);
        }
    }
};
