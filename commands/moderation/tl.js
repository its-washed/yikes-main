const { PermissionFlagsBits } = require('discord.js');
const { warn } = require('../../utils/context');
const { needPerm, needBotPerm } = require('../../utils/moderation');

module.exports = {
    permission: "manage threads",
    data: { name: 'tl', description: 'Lock a thread', usage: ',tl [#thread]' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client, config) {
        if (!await needPerm(message, PermissionFlagsBits.ManageThreads)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageThreads)) return;
        const { lockThread } = require('./thread');
        return lockThread(message, args.join(' '));
    }
};
