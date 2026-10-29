const { PermissionFlagsBits } = require('discord.js');
const { run } = require('../../utils/database');
const { approve } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');

module.exports = {
    permission: "Manage messages",
    data: { name: 'clearsnipes', description: 'Clear the snipes from the channel.', usage: ',clearsnipes' },
    aliases: ['cs'],
    cooldown: 3,
    async execute(message) {
        if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
        for (const table of ['snipes', 'snipes_edit', 'snipes_reaction']) {
            run(`DELETE FROM ${table} WHERE channel_id = ?`, message.channel.id);
        }
        return approve(message, 'Cleared all snipes from this channel');
    }
};
