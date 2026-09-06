const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { loadDevData, saveDevData } = require('../../utils/developer');

module.exports = {
    data: { name: 'disabled', description: 'Disable a command in this server (Server Owner only)', usage: ',disabled [add/remove] [command]' },
    aliases: ['serverdisable'],
    cooldown: 0,
    async execute(message, args) {
        if (message.author.id !== message.guild.ownerId) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'Only the server owner can use this.')] });
        }

        const action = args[0];
        const cmd = args[1];

        if (!action || !cmd) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,disabled [add/remove] [command]')] });

        const data = loadDevData();
        const guildId = message.guild.id;

        if (!data.serverDisabled[guildId]) data.serverDisabled[guildId] = [];

        if (action === 'add') {
            if (data.serverDisabled[guildId].includes(cmd)) return message.reply({ embeds: [errorEmbed('Already Disabled', `\`${cmd}\` is already disabled in this server.`)] });
            data.serverDisabled[guildId].push(cmd);
            saveDevData(data);
            return message.reply({ embeds: [successEmbed(`Disabled **${cmd}** in this server.`)] });
        } else if (action === 'remove') {
            if (!data.serverDisabled[guildId].includes(cmd)) return message.reply({ embeds: [errorEmbed('Not Disabled', `\`${cmd}\` is not disabled in this server.`)] });
            data.serverDisabled[guildId] = data.serverDisabled[guildId].filter(c => c !== cmd);
            saveDevData(data);
            return message.reply({ embeds: [successEmbed(`Enabled **${cmd}** in this server.`)] });
        } else {
            return message.reply({ embeds: [errorEmbed('Invalid Action', 'Use `add` or `remove`.')] });
        }
    }
};
