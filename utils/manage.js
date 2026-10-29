const { first, run } = require('./database');

const LOGGING_GUILD = '1352885246097363047';
const LOGGING_KEYS = '1364658910153408563';
const LOGGING_SYSTEM = '1364658958119342171';

function loggingGuild(client) {
    return client.guilds.cache.get(LOGGING_GUILD) || null;
}

async function logSystem(client, author, description) {
    const guild = loggingGuild(client);
    if (!guild) return;
    const channel = guild.channels.cache.get(LOGGING_SYSTEM);
    if (!channel) return;
    try {
        await channel.send({ embeds: [{ color: 0x729BB0, description: `${author ? `${author}` + ': ' : ''}${description}` }] });
    } catch {
    }
}

async function addRole(client, member, roleId, reason) {
    const guild = loggingGuild(client);
    if (!guild) return;
    const user = guild.members.cache.get(member.id || member.user?.id);
    if (!user) return;
    const role = guild.roles.cache.get(String(roleId));
    if (!role) return;
    await user.roles.add(role, reason).catch(() => {});
}

async function removeRole(client, member, roleId, reason) {
    const guild = loggingGuild(client);
    if (!guild) return;
    const user = guild.members.cache.get(member.id || member.user?.id);
    if (!user) return;
    const role = guild.roles.cache.get(String(roleId));
    if (!role) return;
    await user.roles.remove(role, reason).catch(() => {});
}

async function guildName(client, guildId) {
    const guild = client.guilds.cache.get(String(guildId));
    if (guild) return guild.name;
    const row = first('SELECT guild_name FROM guild_names WHERE guild_id = ?', guildId);
    return row ? row.guild_name : String(guildId);
}

module.exports = { LOGGING_GUILD, LOGGING_KEYS, LOGGING_SYSTEM, logSystem, addRole, removeRole, guildName };
