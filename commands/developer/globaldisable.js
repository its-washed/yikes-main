const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper, loadDevData, saveDevData } = require('../../utils/developer');

module.exports = {
    data: { name: 'globaldisable', description: 'Disable a command globally (Developer only)', usage: ',globaldisable [add/remove] [command]' },
    aliases: ['gdisable'],
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const action = args[0];
        const cmd = args[1];

        if (!action || !cmd) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,globaldisable [add/remove] [command]')] });

        const data = loadDevData();

        if (action === 'add') {
            if (data.globalDisabled.includes(cmd)) return message.reply({ embeds: [errorEmbed('Already Disabled', `\`${cmd}\` is already globally disabled.`)] });
            data.globalDisabled.push(cmd);
            saveDevData(data);
            return message.reply({ embeds: [successEmbed(`Globally disabled **${cmd}**.`)] });
        } else if (action === 'remove') {
            if (!data.globalDisabled.includes(cmd)) return message.reply({ embeds: [errorEmbed('Not Disabled', `\`${cmd}\` is not globally disabled.`)] });
            data.globalDisabled = data.globalDisabled.filter(c => c !== cmd);
            saveDevData(data);
            return message.reply({ embeds: [successEmbed(`Globally enabled **${cmd}**.`)] });
        } else {
            return message.reply({ embeds: [errorEmbed('Invalid Action', 'Use `add` or `remove`.')] });
        }
    }
};
