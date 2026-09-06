const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { addPremiumCommand, removePremiumCommand, isPremiumCommand, loadPremium } = require('../../utils/premium');

module.exports = {
    data: { name: 'premiumcommandadd', description: 'Add/remove a command to the premium-only list (Developer only)', usage: ',premiumcommandadd [add/remove] [command]' },
    aliases: ['premca'],
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const action = args[0];
        const cmd = args[1];

        if (!action || !cmd) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,premiumcommandadd [add/remove] [command]')] });

        if (action === 'add') {
            if (isPremiumCommand(cmd)) return message.reply({ embeds: [errorEmbed('Already Premium', `\`${cmd}\` is already a premium command.`)] });
            addPremiumCommand(cmd);
            return message.reply({ embeds: [successEmbed(`Added **${cmd}** as a premium-only command.`)] });
        } else if (action === 'remove') {
            if (!isPremiumCommand(cmd)) return message.reply({ embeds: [errorEmbed('Not Premium', `\`${cmd}\` is not a premium command.`)] });
            removePremiumCommand(cmd);
            return message.reply({ embeds: [successEmbed(`Removed **${cmd}** from premium commands.`)] });
        } else if (action === 'list') {
            const data = loadPremium();
            if (!data.premiumCommands.length) return message.reply({ embeds: [errorEmbed('Empty', 'No premium commands found.')] });
            const list = data.premiumCommands.map(c => `\`${c}\``).join(', ');
            return message.reply({ embeds: [createEmbed({ color: 0xffd700, title: 'Premium Commands', description: list })] });
        } else {
            return message.reply({ embeds: [errorEmbed('Invalid Action', 'Use `add`, `remove`, or `list`.')] });
        }
    }
};
