const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, jailConfig, requireJail, confirm } = require('../../utils/moderation');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { run } = require('../../utils/database');

module.exports = {
    permission: "administrator",
    data: { name: 'unsetjail', description: 'Disable the jail module', usage: ',unsetjail' },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
        if (!await requireJail(message)) return;

        return confirm(message, `${message.author}: Are you sure you want to **disable** the jail module\n> This action is **IRREVERSIBLE**`,
            async i => {
                const check = await jailConfig(message.guild.id);
                if (check) {
                    const role = message.guild.roles.cache.get(String(check.role_id));
                    const channel = message.guild.channels.cache.get(String(check.channel_id));
                    if (role) {
                        try {
                            await role.delete(`jail disabled by ${message.author.tag}`);
                        } catch (err) {
                            return i.update({ embeds: [errorEmbed(null, `${i.user}: I don't have permission to delete the jail role`)], components: [] }).catch(() => {});
                        }
                    }
                    if (channel) {
                        try {
                            await channel.delete(`jail disabled by ${message.author.tag}`);
                        } catch (err) {
                            return i.update({ embeds: [errorEmbed(null, `${i.user}: I don't have permission to delete the jail channel`)], components: [] }).catch(() => {});
                        }
                    }
                }
                run('DELETE FROM jail WHERE guild_id = ?', message.guild.id);
                run('DELETE FROM jail_members WHERE guild_id = ?', message.guild.id);
                return i.update({ embeds: [successEmbed(null, `${i.user}: Disabled the jail module`)], components: [] }).catch(() => {});
            },
            async i => {
                return i.update({ embeds: [errorEmbed(null, `${i.user}: Jail deactivation got canceled`)], components: [] }).catch(() => {});
            });
    }
};
