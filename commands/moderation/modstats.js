const { PermissionFlagsBits } = require('discord.js');
const { query } = require('../../utils/database');
const { createEmbed, COLORS, PRESERVE } = require('../../utils/embeds');
const { needPerm, resolveUser } = require('../../utils/moderation');

function counts(userId, guildId, since) {
    const rows = since
        ? query("SELECT punishment, COUNT(*) AS total FROM history WHERE moderator_id = ? AND time >= ? AND punishment IN ('Ban', 'Kick', 'Mute', 'Jail') AND server_id = ? GROUP BY punishment", userId, since, guildId)
        : query("SELECT punishment, COUNT(*) AS total FROM history WHERE moderator_id = ? AND punishment IN ('Ban', 'Kick', 'Mute', 'Jail') AND server_id = ? GROUP BY punishment", userId, guildId);
    const out = {};
    for (const row of rows) out[row.punishment] = Number(row.total);
    return out;
}

function fieldFor(label, data) {
    const entries = Object.entries(data);
    return {
        name: label,
        value: entries.length ? entries.map(([key, value]) => `${key}: ${value}`).join('\n') : 'N/A',
        inline: true
    };
}

module.exports = {
    permission: "moderate members",
    data: { name: 'modstats', description: "View a summary of a moderator's punishment statistics", usage: ',modstats [user]' },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ModerateMembers)) return;

        const user = await resolveUser(message, client, args[0]);
        if (!user) return require('../../utils/context').warn(message, `No user called **${args[0]}** found`);

        const now = Date.now() / 1000;
        const sevenDays = now - 7 * 86400;
        const fourteenDays = now - 14 * 86400;

        const embed = createEmbed({
            color: COLORS.neutral,
            title: 'Punishment Statistics',
            author: {
                name: user.username,
                icon_url: user.displayAvatarURL({ size: 256 })
            },
            fields: [
                fieldFor('7 Days', counts(user.id, message.guild.id, sevenDays)),
                fieldFor('14 Days', counts(user.id, message.guild.id, fourteenDays)),
                fieldFor('All Time', counts(user.id, message.guild.id, null))
            ]
        });

        return message.reply({ embeds: [embed], [PRESERVE]: true });
    }
};
