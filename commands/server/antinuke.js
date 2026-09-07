const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'antinuke',
        description: 'Configure antinuke protection',
        usage: ',antinuke <enable|disable|config> [args]'
    },
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `enable`, `disable`, `config`')] });

        if (sub === 'enable') {
            const modRole = message.mentions.roles.first();
            updateGuildConfig(message.guild.id, {
                antinuke: {
                    enabled: true,
                    modRole: modRole?.id || null,
                    punishment: args[2]?.toLowerCase() || 'remove',
                    logChannel: config.logChannel || null
                }
            });
            return message.reply({ embeds: [successEmbed('Antinuke Enabled', `Protection is now active.${modRole ? ` Mod role: ${modRole}` : ''}\nPunishment: \`remove\` (roles are reverted)`)] });
        }

        if (sub === 'disable') {
            updateGuildConfig(message.guild.id, { antinuke: { enabled: false } });
            return message.reply({ embeds: [successEmbed('Antinuke Disabled', 'Protection turned off.')] });
        }

        if (sub === 'config') {
            const antinuke = config.antinuke || {};
            const modRole = antinuke.modRole ? message.guild.roles.cache.get(antinuke.modRole) : null;
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Antinuke Configuration',
                    fields: [
                        { name: 'Enabled', value: antinuke.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Mod Role', value: modRole ? `${modRole}` : 'None', inline: true },
                        { name: 'Punishment', value: antinuke.punishment || 'remove', inline: true }
                    ]
                })]
            });
        }

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid: `enable`, `disable`, `config`')] });
    }
};
