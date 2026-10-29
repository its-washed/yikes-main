const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { run, query } = require('../../utils/database');
const { warn } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');

module.exports = {
    data: { name: 'checkout', description: 'Create a checkout for a user', usage: ',checkout <user> <amount>' },
    aliases: ['co'],
    cooldown: 5,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;

        const mentioned = message.mentions.users.first();
        const id = args[0] ? String(args[0]).replace(/[<@!>]/g, '') : null;
        const target = mentioned || (id && /^\d{17,20}$/.test(id) ? await client.users.fetch(id).catch(() => null) : null);
        const amount = args.slice(1).join(' ').trim();
        if (!target || !amount) return warn(message, 'Usage: `checkout <user> <amount>`');

        const methods = query('SELECT method FROM payment_methods WHERE available = 1 AND guild_id = ?', message.guild.id);
        if (!methods.length) return warn(message, 'There are **no** payment methods set');

        const rows = [];
        for (let i = 0; i < methods.length; i += 5) {
            const row = new ActionRowBuilder();
            for (const entry of methods.slice(i, i + 5)) {
                row.addComponents(new ButtonBuilder()
                    .setCustomId(`checkout_select_${entry.method}`)
                    .setLabel(String(entry.method).charAt(0).toUpperCase() + String(entry.method).slice(1))
                    .setStyle(ButtonStyle.Primary));
            }
            rows.push(row);
        }

        const sent = await message.reply({
            content: `${target}`,
            embeds: [{
                color: 0x729bb0,
                title: 'Checkout',
                fields: [
                    { name: '> **Amount:**', value: `\`\`\`${amount}\`\`\``, inline: false },
                    { name: '> **Information:**', value: '```Click on one of the buttons below to select a payment method and complete your checkout.```', inline: false }
                ],
                footer: { text: message.guild.name, icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : 'https://cdn.discordapp.com/embed/avatars/0.png' },
                thumbnail: { url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : 'https://cdn.discordapp.com/embed/avatars/0.png' },
                timestamp: message.createdAt.toISOString()
            }],
            components: rows
        });

        run('INSERT OR REPLACE INTO checkout (message, amount) VALUES (?, ?)', sent.id, amount);
        message.delete().catch(() => {});
        return sent;
    }
};
