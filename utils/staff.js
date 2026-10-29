const { first } = require('./database');
const fs = require('fs');
const path = require('path');
const { warn } = require('./context');
const { createEmbed } = require('./embeds');
const { COLORS } = require('./styles');
const { isDeveloper } = require('./developer');

const RANKS = { supporter: 1, moderator: 2, manager: 3, developer: 4 };
const LOGGING_GUILD = '1352885246097363047';
const COGS = fs.readdirSync(path.join(__dirname, '..', 'commands'))
    .filter(entry => fs.statSync(path.join(__dirname, '..', 'commands', entry)).isDirectory());

function rankOf(userId) {
    const row = first('SELECT rank, role FROM team_members WHERE user_id = ?', userId);
    const stored = row && (row.rank || row.role);
    if (stored) {
        const value = RANKS[String(stored).toLowerCase()];
        if (value) return value;
    }
    return isDeveloper(userId) ? 4 : 0;
}

async function needModerator(message) {
    if (rankOf(message.author.id) >= 2) return true;
    await warn(message, 'You need the **bot moderator** rank to use this command');
    return false;
}

async function needManager(message) {
    if (rankOf(message.author.id) >= 3) return true;
    await warn(message, 'You need the **bot manager** rank to use this command');
    return false;
}

async function staffLog(client, author, text, category) {
    try {
        const guild = client.guilds.cache.get(LOGGING_GUILD);
        if (!guild) return;
        const channel = guild.channels.cache.find(entry => entry.isTextBased() && entry.name.toLowerCase() === String(category || '').toLowerCase())
            || guild.systemChannel;
        if (!channel) return;
        await channel.send({ embeds: [createEmbed({ color: COLORS.NEUTRAL, description: `**${author.tag}** (\`${author.id}\`)\n${text}` })] });
    } catch (err) {}
}

function guildName(client, guildId, unknown) {
    const guild = client.guilds.cache.get(String(guildId));
    if (guild) return guild.name;
    return unknown ? 'Unknown Server' : 'Unknown';
}

async function addTeamRole(client, userId, roleId) {
    try {
        const guild = client.guilds.cache.get(LOGGING_GUILD);
        if (!guild) return false;
        const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
        if (!member) return false;
        await member.roles.add(roleId, 'Staff action').catch(() => {});
        return true;
    } catch (err) {
        return false;
    }
}

async function resolveServer(client, token) {
    const raw = String(token || '').trim();
    if (!raw) return null;
    if (/^\d{16,22}$/.test(raw)) return raw;
    const invite = await client.fetchInvite(raw.replace(/^https?:\/\/(discord\.gg|discord\.com\/invite)\//, '')).catch(() => null);
    return invite && invite.guild ? invite.guild.id : null;
}

module.exports = { rankOf, needModerator, needManager, staffLog, guildName, COGS, addTeamRole, resolveServer };
