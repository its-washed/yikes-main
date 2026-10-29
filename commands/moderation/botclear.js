const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, prefix } = require('../../utils/moderation');

module.exports = {
    permission: "manage messages",
    data: { name: 'botclear', description: 'Delete messages sent by bots and messages starting with the command prefix', usage: ',botclear' },
    aliases: ['bc', 'bp', 'botpurge'],
    cooldown: 5,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageMessages)) return;

        const channel = message.channel;
        const cmdPrefix = prefix(message);
        const fetched = await channel.messages.fetch({ limit: 100 }).catch(() => null);
        if (!fetched) return;

        const targets = fetched.filter(entry =>
            entry.id !== message.id && !entry.pinned && (entry.author.bot || entry.content.startsWith(cmdPrefix)));

        if (targets.size) {
            await channel.bulkDelete(targets, true).catch(() => {});
        }
        await message.delete().catch(() => {});
        return null;
    }
};
