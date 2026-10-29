const { PermissionFlagsBits } = require('discord.js');
const { needBotPerm, prefix } = require('../../utils/moderation');
const { warn } = require('../../utils/context');
const { needPerks } = require('../../utils/predicates');

module.exports = {
    permission: "donator",
    data: { name: 'impersonate', description: 'Impersonate a member', usage: ',impersonate <user> <message>' },
    aliases: ['imp'],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await needPerks(message, client)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageWebhooks)) return;

        const mentioned = message.mentions.users.first();
        const tokens = [...args];
        if (mentioned) {
            const idx = tokens.findIndex(t => /^<@!?\d+>$/.test(t));
            if (idx !== -1) tokens.splice(idx, 1);
        } else if (/^\d{17,20}$/.test(tokens[0] || '')) {
            const id = tokens.shift();
            const fetched = await client.users.fetch(id).catch(() => null);
            if (fetched) var resolved = fetched;
        }
        const member = mentioned || (typeof resolved !== 'undefined' ? resolved : null);
        if (!member) return warn(message, `Usage: \`${prefix(message)}impersonate its_washed message\``);

        const text = tokens.join(' ').trim();
        if (!text) return warn(message, 'Please **provide** a message to impersonate');

        try {
            await message.delete().catch(() => {});
            const webhooks = await message.channel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.owner && wh.owner.id === client.user.id) || null;
            if (!webhook) {
                webhook = await message.channel.createWebhook({ name: member.displayName || member.username });
            }
            const attachment = message.attachments.first();
            const payload = {
                content: text,
                username: member.displayName || member.username,
                avatarURL: member.displayAvatarURL({ size: 256 }),
                allowedMentions: { parse: [] },
                files: attachment ? [{ attachment: attachment.url, name: attachment.name }] : []
            };
            return await webhook.send(payload);
        } catch (err) {
            return warn(message, 'Please **provide** a message to impersonate');
        }
    }
};
