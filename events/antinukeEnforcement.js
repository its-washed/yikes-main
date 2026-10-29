const { Events, AuditLogEvent } = require('discord.js');
const { first, run } = require('../utils/database');
const antinuke = require('../utils/antinuke');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function act(guild, executor, module, reason, label, started) {
    await antinuke.decidePunishment(module, executor, reason, guild);
    const { owner_id, logs } = antinuke.getLogChannel(guild);
    await antinuke.takeAction(guild.client, label, executor, (Date.now() - started) / 1000, owner_id, logs);
}

async function onRoleEdit(before, after) {
    const guild = before.guild;
    if (!antinuke.botCanModerate(guild)) return;
    if (!antinuke.isModule('edit role', guild.id)) return;
    if (before.permissions.bitfield === after.permissions.bitfield) return;
    if (!antinuke.isDangerous(before) && !antinuke.isDangerous(after)) return;
    if (antinuke.isDangerous(before) && !antinuke.isDangerous(after)) return;
    if (await antinuke.handleRatelimit(guild)) return;

    await antinuke.queueAuditLog(guild, AuditLogEvent.RoleUpdate, async (entry) => {
        const executor = await antinuke.resolveExecutor(guild, entry);
        if (!executor) return;
        if (!antinuke.isBelowBot(executor, guild.members.me)) return;
        if (await antinuke.isWhitelistedAsync(guild.id, executor)) return;

        const started = Date.now();
        const jobs = [];
        if (!antinuke.isDangerous(before) && antinuke.isDangerous(after)) {
            jobs.push(after.setPermissions(before.permissions, '[Antinuke] Maliciously editing roles').catch(() => {}));
        }
        jobs.push(antinuke.decidePunishment('edit role', executor, '[Antinuke] Maliciously editing roles', guild));
        await Promise.allSettled(jobs);

        const { owner_id, logs } = antinuke.getLogChannel(guild);
        await antinuke.takeAction(guild.client, 'Maliciously editing roles', executor, (Date.now() - started) / 1000, owner_id, logs);
    });
}

async function onGuildUpdate(before, after) {
    if (before.ownerId !== after.ownerId) {
        run('INSERT INTO owner_history (guild_id, old_owner, new_owner, timestamp) VALUES (?, ?, ?, ?)',
            before.id, before.ownerId, after.ownerId, Date.now() / 1000);
        const row = first('SELECT 1 AS ok FROM antinuke WHERE guild_id = ? AND owner_id = ?', before.id, before.ownerId);
        if (row) run('UPDATE antinuke SET owner_id = ? WHERE guild_id = ?', after.ownerId, before.id);
    }

    if (before.vanityURLCode === after.vanityURLCode) return;
    if (!before.vanityURLCode) return;
    if (!antinuke.isModule('vanity change', after.id)) return;
    if (await antinuke.handleRatelimit(after)) return;

    await antinuke.queueAuditLog(after, AuditLogEvent.GuildUpdate, async (entry) => {
        const executor = await antinuke.resolveExecutor(after, entry);
        if (!executor) return;
        if (await antinuke.isWhitelistedAsync(after.id, executor)) return;
        if (!antinuke.isBelowBot(executor, after.members.me)) return;

        const started = Date.now();
        await act(after, executor, 'vanity change', '[Antinuke] Unauthorized vanity URL change', 'Vanity URL change', started);
    });
}

async function onBotJoin(member) {
    const guild = member.guild;
    if (!antinuke.botCanModerate(guild)) return;
    if (!member.user.bot) return;
    if (!antinuke.isModule('bot add', guild.id)) return;
    if (await antinuke.handleRatelimit(guild)) return;

    await antinuke.queueAuditLog(guild, AuditLogEvent.BotAdd, async (entry) => {
        if (antinuke.joinedWhitelist(member)) return;
        const executor = await antinuke.resolveExecutor(guild, entry);
        if (!executor) return;
        if (!antinuke.isBelowBot(executor, guild.members.me)) return;
        if (await antinuke.isWhitelistedAsync(guild.id, executor)) return;

        const started = Date.now();
        await Promise.allSettled([
            member.ban({ reason: 'Unwhitelisted bot added' }).catch(() => {}),
            antinuke.decidePunishment('bot add', executor, '[Antinuke] Adding unwhitelisted bots', guild)
        ]);
        const { owner_id, logs } = antinuke.getLogChannel(guild);
        await antinuke.takeAction(guild.client, 'Adding unwhitelisted bot', executor, (Date.now() - started) / 1000, owner_id, logs);
    });
}

async function onChannelCreate(channel) {
    const guild = channel.guild;
    if (!guild) return;
    if (!antinuke.botCanModerate(guild)) return;
    if (!antinuke.isModule('channel create', guild.id)) return;
    if (await antinuke.handleRatelimit(guild)) return;

    await antinuke.queueAuditLog(guild, AuditLogEvent.ChannelCreate, async (entry) => {
        const executor = await antinuke.resolveExecutor(guild, entry);
        if (!executor) return;
        if (!antinuke.isBelowBot(executor, guild.members.me)) return;
        if (await antinuke.isWhitelistedAsync(guild.id, executor)) return;
        if (!antinuke.checkModuleThreshold('channel create', guild.id, executor.id)) return;

        await channel.delete('[Antinuke] Creating channels').catch(() => {});
        if (!antinuke.claimFlag(`createchannel-${guild.id}`)) return;

        const started = Date.now();
        await act(guild, executor, 'channel create', '[Antinuke] Creating channels', 'Creating channels', started);
    });
}

async function onChannelDelete(channel) {
    const guild = channel.guild;
    if (!guild) return;
    if (!antinuke.botCanModerate(guild)) return;
    if (!antinuke.isModule('channel delete', guild.id)) return;
    if (await antinuke.handleRatelimit(guild)) return;

    await antinuke.queueAuditLog(guild, AuditLogEvent.ChannelDelete, async (entry) => {
        const executor = await antinuke.resolveExecutor(guild, entry);
        if (!executor) return;
        if (!antinuke.isBelowBot(executor, guild.members.me)) return;
        if (await antinuke.isWhitelistedAsync(guild.id, executor)) return;
        if (!antinuke.checkModuleThreshold('channel delete', guild.id, executor.id)) return;

        try {
            await channel.clone(channel.name, '[Antinuke] Deleting channels');
        } catch (err) {}
        if (!antinuke.claimFlag(`deletechannel-${guild.id}`)) return;

        const started = Date.now();
        await act(guild, executor, 'channel delete', '[Antinuke] Deleting channels', 'Deleting channels', started);
    });
}

async function onRoleCreate(role) {
    const guild = role.guild;
    if (!guild) return;
    if (!antinuke.botCanModerate(guild)) return;
    if (!antinuke.isModule('role create', guild.id)) return;
    if (await antinuke.handleRatelimit(guild)) return;

    await antinuke.queueAuditLog(guild, AuditLogEvent.RoleCreate, async (entry) => {
        const executor = await antinuke.resolveExecutor(guild, entry);
        if (!executor) return;
        if (!antinuke.isBelowBot(executor, guild.members.me)) return;
        if (await antinuke.isWhitelistedAsync(guild.id, executor)) return;
        if (!antinuke.checkModuleThreshold('role create', guild.id, executor.id)) return;

        await role.delete('[Antinuke] Creating roles').catch(() => {});
        if (!antinuke.claimFlag(`rolecreate-${guild.id}`)) return;

        const started = Date.now();
        await act(guild, executor, 'role create', '[Antinuke] Creating roles', 'Creating roles', started);
    });
}

async function onRoleDelete(role) {
    const guild = role.guild;
    if (!guild) return;
    if (!antinuke.botCanModerate(guild)) return;
    if (!antinuke.isModule('role delete', guild.id)) return;
    if (await antinuke.handleRatelimit(guild)) return;

    await antinuke.queueAuditLog(guild, AuditLogEvent.RoleDelete, async (entry) => {
        const executor = await antinuke.resolveExecutor(guild, entry);
        if (!executor) return;
        if (!antinuke.isBelowBot(executor, guild.members.me)) return;
        if (await antinuke.isWhitelistedAsync(guild.id, executor)) return;
        if (!antinuke.checkModuleThreshold('role delete', guild.id, executor.id)) return;

        try {
            const options = {
                name: role.name,
                permissions: role.permissions,
                color: role.color,
                hoist: role.hoist,
                mentionable: role.mentionable,
                reason: '[Antinuke] Deleting roles'
            };
            if (role.icon) {
                try {
                    const res = await fetch(role.iconURL({ size: 4096 }));
                    options.icon = Buffer.from(await res.arrayBuffer());
                } catch (err) {}
            }
            await guild.roles.create(options);
        } catch (err) {}
        if (!antinuke.claimFlag(`roledelete-${guild.id}`)) return;

        const started = Date.now();
        await act(guild, executor, 'role delete', '[Antinuke] Deleting roles', 'Deleting roles', started);
    });
}

async function onMemberRoleUpdate(before, after) {
    if (before.roles.cache.size >= after.roles.cache.size) return;
    const added = after.roles.cache.filter((role) => !before.roles.cache.has(role.id) && role.editable);
    if (!added.size) return;
    const guild = before.guild;
    if (!antinuke.botCanModerate(guild)) return;

    const lockRow = first('SELECT status, roles FROM antinuke_roles WHERE guild_id = ?', guild.id);
    const lockEnabled = Boolean(lockRow && lockRow.status);

    if (lockEnabled) {
        let lockedRoles = [];
        try {
            lockedRoles = JSON.parse(lockRow.roles || '[]');
        } catch (err) {}
        const toRevert = added.filter((role) => lockedRoles.includes(role.id));
        if (toRevert.size) {
            await sleep(1000);
            await antinuke.queueAuditLog(guild, AuditLogEvent.MemberRoleUpdate, async (entry) => {
                const executor = await antinuke.resolveExecutor(guild, entry);
                if (!executor) return;
                if (await antinuke.isWhitelistedAsync(guild.id, executor)) return;
                if (!antinuke.isBelowBot(executor, guild.members.me)) return;

                const started = Date.now();
                try {
                    await after.roles.set(after.roles.cache.filter((role) => !toRevert.has(role.id)), 'Locked roles being reverted');
                } catch (err) {}
                const { owner_id, logs } = antinuke.getLogChannel(guild);
                await antinuke.takeAction(guild.client, 'Locked role assigned', executor, (Date.now() - started) / 1000, owner_id, logs);
            });
            return;
        }
    }

    const dangerous = added.filter((role) => antinuke.isDangerous(role));
    if (!dangerous.size) return;
    if (!antinuke.isModule('role giving', guild.id)) return;

    await sleep(1000);
    await antinuke.queueAuditLog(guild, AuditLogEvent.MemberRoleUpdate, async (entry) => {
        const executor = await antinuke.resolveExecutor(guild, entry);
        if (!executor) return;
        if (await antinuke.isWhitelistedAsync(guild.id, executor)) return;
        if (!antinuke.isBelowBot(executor, guild.members.me)) return;
        antinuke.claimFlag(`role-give-${guild.id}`);

        const stillAdded = after.roles.cache.filter((role) => !before.roles.cache.has(role.id) && role.editable);
        if (!stillAdded.size) return;

        const started = Date.now();
        await Promise.allSettled([
            after.roles.set(after.roles.cache.filter((role) => !stillAdded.has(role.id)), 'Reverting added roles').catch(() => {}),
            antinuke.decidePunishment('role giving', executor, 'Giving roles with dangerous permissions', guild)
        ]);
        const { owner_id, logs } = antinuke.getLogChannel(guild);
        await antinuke.takeAction(guild.client, 'Giving roles with dangerous permissions', executor, (Date.now() - started) / 1000, owner_id, logs);
    });
}

async function onMemberKick(member) {
    const guild = member.guild;
    if (!guild) return;
    if (!antinuke.botCanModerate(guild)) return;
    if (!antinuke.isModule('kick', guild.id)) return;

    await antinuke.queueAuditLog(guild, AuditLogEvent.MemberKick, async (entry) => {
        const executor = await antinuke.resolveExecutor(guild, entry);
        if (!executor) return;
        if (await antinuke.isWhitelistedAsync(guild.id, executor)) return;
        if (!antinuke.isBelowBot(executor, guild.members.me)) return;
        if (!antinuke.checkModuleThreshold('kick', guild.id, executor.id)) return;
        if (!antinuke.claimFlag(`kick-${guild.id}`)) return;

        const started = Date.now();
        await act(guild, executor, 'kick', '[Antinuke] Kicking members', 'Kicking members', started);
    });
}

async function onMemberBan(guild, user) {
    if (!antinuke.botCanModerate(guild)) return;
    if (!antinuke.isModule('ban', guild.id)) return;

    await antinuke.queueAuditLog(guild, AuditLogEvent.MemberBanAdd, async (entry) => {
        const executor = await antinuke.resolveExecutor(guild, entry);
        if (!executor) return;
        if (await antinuke.isWhitelistedAsync(guild.id, executor)) return;
        const bannedMember = guild.members.cache.get(user.id);
        if (bannedMember && !antinuke.isBelowBot(executor, guild.members.me)) return;
        if (!antinuke.checkModuleThreshold('ban', guild.id, executor.id)) return;
        if (!antinuke.claimFlag(`ban-${guild.id}`)) return;

        const started = Date.now();
        await act(guild, executor, 'ban', '[Antinuke] Banning members', 'Banning members', started);
    });
}

module.exports = [
    { name: Events.GuildRoleUpdate, once: false, execute: onRoleEdit },
    { name: Events.GuildUpdate, once: false, execute: onGuildUpdate },
    { name: Events.GuildMemberAdd, once: false, execute: onBotJoin },
    { name: Events.ChannelCreate, once: false, execute: onChannelCreate },
    { name: Events.ChannelDelete, once: false, execute: onChannelDelete },
    { name: Events.GuildRoleCreate, once: false, execute: onRoleCreate },
    { name: Events.GuildRoleDelete, once: false, execute: onRoleDelete },
    { name: Events.GuildMemberUpdate, once: false, execute: onMemberRoleUpdate },
    { name: Events.GuildMemberRemove, once: false, execute: onMemberKick },
    { name: Events.GuildBanAdd, once: false, execute: onMemberBan }
];
