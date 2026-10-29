const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    permission: "manage messages",
    data: { name: 'ce', description: "Create an embed using an embed code\n> **Embed Builder:** https://evelina.bot/embed", usage: ',ce {embed}$v{description: Hello world}', params: ['payload'] },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const embed = message.client.commands.get('embed') || message.client.commands.get(message.client.aliases.get('embed'));
        if (!embed || !embed.subs || !embed.subs.create) return;
        return embed.subs.create.execute(message, args, client, config);
    }
};
