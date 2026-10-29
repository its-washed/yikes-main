const { Events, PermissionFlagsBits } = require('discord.js');
const { first } = require('../utils/database');
const { formatTimespan } = require('../utils/moderation');
const { createEmbed } = require('../utils/embeds');
const { COLORS, EMOJIS } = require('../utils/styles');

function parseList(value) {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

async function takeAction(member, punishment, reason, logsId) {
    try {
        if (punishment === 'ban') await member.ban({ reason });
        else if (punishment === 'kick') await member.kick(reason);
        else if (punishment === 'timeout') await member.timeout(600000, reason);
    } catch (err) {}
    if (logsId) {
        const channel = member.guild.channels.cache.get(String(logsId));
        if (channel) {
            await channel.send({
                embeds: [createEmbed({ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${member}: **${punishment}** — ${reason}` })]
            }).catch(() => {});
        }
    }
}

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member) {
        if (!member.guild || member.user.bot) return;
        const config = first('SELECT * FROM antiraid WHERE guild_id = ?', member.guild.id);
        if (!config || String(config.configured) !== 'true') return;
        const whitelisted = parseList(config.whitelisted).map(Number);
        if (whitelisted.includes(Number(member.id))) return;
        const me = member.guild.members.me;
        if (!me || !me.permissions.has(PermissionFlagsBits.BanMembers) || !me.permissions.has(PermissionFlagsBits.KickMembers)) return;

        const age = first('SELECT * FROM antiraid_age WHERE guild_id = ?', member.guild.id);
        if (age) {
            const threshold = Number(age.threshold || 0);
            const accountAge = (Date.now() - member.user.createdAt.getTime()) / 1000;
            if (accountAge < threshold) {
                return takeAction(member, age.punishment, `Account younger than ${formatTimespan(threshold)}`, config.logs);
            }
        }

        const avatar = first('SELECT * FROM antiraid_avatar WHERE guild_id = ?', member.guild.id);
        if (avatar && !member.user.avatar) {
            return takeAction(member, avatar.punishment, 'Default Avatar', config.logs);
        }
    }
};
