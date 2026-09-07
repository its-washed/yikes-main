const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/config');
const { logger } = require('../utils/logger');

const actionLog = new Map();

module.exports = {
    name: Events.GuildMemberUpdate,
    once: false,

    async execute(oldMember, newMember) {
        if (newMember.user.bot) return;
        const config = getGuildConfig(newMember.guild.id);
        if (!config.antinuke?.enabled) return;

        const logChannel = newMember.guild.channels.cache.get(config.logChannel);
        const modRole = config.antinuke.modRole;
        const isMod = modRole && newMember.roles.cache.has(modRole);

        if (isMod) return;

        const changes = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

        if (changes.size > 0) {
            for (const [, role] of changes) {
                if (role.permissions.has(PermissionFlagsBits.Administrator) || role.permissions.has(PermissionFlagsBits.ManageGuild) || role.permissions.has(PermissionFlagsBits.BanMembers)) {
                    if (config.antinuke?.punishment === 'remove') {
                        try {
                            await newMember.roles.remove(role, 'Antinuke: dangerous role added');
                        } catch {}
                        if (logChannel) {
                            logChannel.send({
                                embeds: [new EmbedBuilder()
                                    .setColor(0xff4757)
                                    .setTitle('Antinuke Triggered')
                                    .setDescription(`${newMember} added dangerous role **${role.name}**. Role removed.`)
                                    .setTimestamp()
                                ]
                            }).catch(() => {});
                        }
                    }
                }
            }
        }

        if (removed.size > 0) {
            for (const [, role] of removed) {
                if (role.permissions.has(PermissionFlagsBits.Administrator) || role.permissions.has(PermissionFlagsBits.ManageGuild)) {
                    if (config.antinuke?.punishment === 'remove') {
                        try {
                            await newMember.roles.add(role, 'Antinuke: dangerous role removed');
                        } catch {}
                        if (logChannel) {
                            logChannel.send({
                                embeds: [new EmbedBuilder()
                                    .setColor(0xffa502)
                                    .setTitle('Antinuke Triggered')
                                    .setDescription(`${newMember} removed role **${role.name}**. Role restored.`)
                                    .setTimestamp()
                                ]
                            }).catch(() => {});
                        }
                    }
                }
            }
        }
    }
};
