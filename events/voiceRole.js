const { Events } = require('discord.js');
const { first } = require('../utils/database');

function parseRoles(value) {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,

    async execute(member, before, after) {
        if (!member || !member.guild) return;
        try {
            const guild = member.guild;

            if (before.channel && (!after.channel || before.channel.id !== after.channel.id)) {
                const defaultRow = first('SELECT role_id FROM voicerole_default WHERE guild_id = ?', guild.id);
                if (defaultRow) {
                    const role = guild.roles.cache.get(String(defaultRow.role_id));
                    if (role && member.roles.cache.has(role.id)) {
                        await member.roles.remove(role, 'Left voice channel').catch(() => {});
                    }
                }
                const check = first('SELECT roles FROM voicerole WHERE guild_id = ? AND channel_id = ?', guild.id, before.channel.id);
                if (check) {
                    const roles = parseRoles(check.roles)
                        .map(id => guild.roles.cache.get(String(id)))
                        .filter(Boolean);
                    if (roles.length) await member.roles.remove(roles, 'Left voice channel').catch(() => {});
                }
            }

            if (after.channel && (!before.channel || before.channel.id !== after.channel.id)) {
                const defaultRow = first('SELECT role_id FROM voicerole_default WHERE guild_id = ?', guild.id);
                if (defaultRow) {
                    const role = guild.roles.cache.get(String(defaultRow.role_id));
                    if (role && !member.roles.cache.has(role.id)) {
                        await member.roles.add(role, 'Joined voice channel').catch(() => {});
                    }
                }
                const check = first('SELECT roles FROM voicerole WHERE guild_id = ? AND channel_id = ?', guild.id, after.channel.id);
                if (check) {
                    const roles = parseRoles(check.roles)
                        .map(id => guild.roles.cache.get(String(id)))
                        .filter(Boolean);
                    if (roles.length) await member.roles.add(roles, 'Joined voice channel').catch(() => {});
                }
            }
        } catch (err) {}
    }
};
