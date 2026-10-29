const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig } = require('../utils/config');
const { first, query, run } = require('../utils/database');
const { toPayload } = require('../utils/moderation');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member) {
        try {
            run('INSERT INTO activity_joined (guild_id, user_id, timestamp) VALUES (?, ?, ?)',
                member.guild.id, member.id, Date.now() / 1000);
        } catch (err) {}
        try {
            const moduleRow = first('SELECT embed, punishment FROM whitelist_module WHERE guild_id = ?', member.guild.id);
            if (moduleRow) {
                const listed = first('SELECT 1 AS ok FROM whitelist WHERE guild_id = ? AND user_id = ?', member.guild.id, member.id);
                if (!listed) {
                    const mode = moduleRow.embed || 'default';
                    if (mode === 'default') {
                        await member.send(`You are not whitelisted to join **${member.guild.name}**`).catch(() => {});
                    } else if (mode !== 'none') {
                        const payload = toPayload(mode);
                        if (payload) await member.send(payload).catch(() => {});
                    }
                    if (moduleRow.punishment === 'ban') {
                        await member.guild.ban(member, { reason: 'Not in the whitelist' }).catch(() => {});
                        return;
                    }
                    if (moduleRow.punishment === 'kick') {
                        await member.guild.kick(member, 'Not in the whitelist').catch(() => {});
                        return;
                    }
                }
            }
        } catch (err) {
        }

        const config = getGuildConfig(member.guild.id);

        if (config.autorole) {
            try {
                const role = member.guild.roles.cache.get(config.autorole);
                if (role) {
                    await member.roles.add(role, 'Auto role on join');
                }
            } catch (error) {}
        }

        try {
            const me = member.guild.members.me;
            if (me && me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                const jailed = first('SELECT 1 AS ok FROM jail_members WHERE guild_id = ? AND user_id = ?', member.guild.id, member.id);
                if (!jailed) {
                    const assign = async (rows, reason) => {
                        for (const row of rows) {
                            const role = member.guild.roles.cache.get(String(row.role_id));
                            if (role && !role.managed && role.id !== member.guild.id && role.position < me.roles.highest.position && !member.roles.cache.has(role.id)) {
                                try {
                                    await member.roles.add(role, reason);
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                } catch (err) {}
                            }
                        }
                    };
                    await assign(query('SELECT role_id FROM autorole WHERE guild_id = ?', member.guild.id), 'AutoRole for all members');
                    if (!member.user.bot) {
                        await assign(query('SELECT role_id FROM autorole_humans WHERE guild_id = ?', member.guild.id), 'AutoRole for humans');
                    } else {
                        await assign(query('SELECT role_id FROM autorole_bots WHERE guild_id = ?', member.guild.id), 'AutoRole for bots');
                    }
                }
            }
        } catch (error) {}

        if (config.welcomeChannel) {
            const channel = member.guild.channels.cache.get(config.welcomeChannel);
            if (channel) {
                const message = (config.welcomeMessage || 'Welcome to the server, {user}!')
                    .replace(/{user}/g, `${member}`)
                    .replace(/{username}/g, member.user.username)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{count}/g, member.guild.memberCount)
                    .replace(/{channel}/g, `<#${channel.id}>`)
                    .replace(/{memberCount}/g, member.guild.memberCount);

                const embed = new EmbedBuilder()
                    .setColor(0x39ffb8)
                    .setTitle('Welcome!')
                    .setDescription(message)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: `Member #${member.guild.memberCount}` })
                    .setTimestamp();

                channel.send({ embeds: [embed] }).catch(() => {});
            }
        }

        if (config.ghostPing?.enabled && config.ghostPing?.channel) {
            const gpChannel = member.guild.channels.cache.get(config.ghostPing.channel);
            if (gpChannel) {
                try {
                    const pingMsg = await gpChannel.send({ content: `${member}` });
                    setTimeout(() => {
                        pingMsg.delete().catch(() => {});
                    }, 3000);
                } catch {}
            }
        }
    }
};
