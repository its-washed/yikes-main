const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'maintenance', description: 'Toggle maintenance mode (Developer only)', usage: ',maintenance [on|off]' },
    aliases: ['maint'],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const state = args[0]?.toLowerCase();
        if (!state || !['on', 'off'].includes(state)) {
            return message.reply({ embeds: [errorEmbed('Usage', ',maintenance <on|off>')] });
        }

        const enabled = state === 'on';
        client.maintenanceMode = enabled;

        return message.reply({
            embeds: [successEmbed('Maintenance', `Maintenance mode **${enabled ? 'enabled' : 'disabled'}**.\n${enabled ? 'Only developers can use commands.' : 'All users can use commands again.'}`)]
        });
    }
};
