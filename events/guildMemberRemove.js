const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/config');
const { run, first } = require('../utils/database');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,

    async execute(member) {
        try {
            run('INSERT INTO activity_left (guild_id, user_id, timestamp) VALUES (?, ?, ?)',
                member.guild.id, member.id, Date.now() / 1000);
        } catch (err) {}
        const config = getGuildConfig(member.guild.id);

        try {
            run('INSERT OR REPLACE INTO restore (guild_id, user_id, roles) VALUES (?, ?, ?)',
                member.guild.id, member.id, JSON.stringify(member.roles.cache.map(role => role.id)));
        } catch (err) {
        }

        try {
            const premiumRole = member.guild.premiumSubscriberRole;
            if (member.premiumSince || (premiumRole && member.roles.cache.has(premiumRole.id))) {
                run('INSERT INTO booster_lost (guild_id, user_id, timestamp) VALUES (?, ?, ?)',
                    member.guild.id, member.id, Date.now() / 1000);
                const row = first('SELECT role_id FROM booster_roles WHERE guild_id = ? AND user_id = ?', member.guild.id, member.id);
                if (row) {
                    const role = member.guild.roles.cache.get(String(row.role_id));
                    run('DELETE FROM booster_roles WHERE guild_id = ? AND user_id = ?', member.guild.id, member.id);
                    if (role) await role.delete('booster left the server').catch(() => {});
                }
            }
        } catch (err) {
        }

        if (config.goodbyeChannel) {
            const channel = member.guild.channels.cache.get(config.goodbyeChannel);
            if (channel) {
                const message = (config.goodbyeMessage || 'Goodbye {user}, we will miss you!')
                    .replace(/{user}/g, member.user.tag)
                    .replace(/{username}/g, member.user.username)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{count}/g, member.guild.memberCount)
                    .replace(/{channel}/g, `<#${channel.id}>`)
                    .replace(/{memberCount}/g, member.guild.memberCount);

                const embed = new EmbedBuilder()
                    .setColor(0xff3939)
                    .setTitle('Goodbye!')
                    .setDescription(message)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: `Member #${member.guild.memberCount}` })
                    .setTimestamp();

                channel.send({ embeds: [embed] }).catch(() => {});
            }
        }
    }
};
