const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { isDeveloper, loadDevData, saveDevData } = require('../../utils/developer');

module.exports = {
    permission: "bot moderator",
    data: { name: 'globaldisable', description: "Globally disable a command", usage: ',globaldisable [add/remove] [command/category]' },
    aliases: ["gd"],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        const action = args[0];
        const cmd = args[1];

        if (!action || !cmd) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,globaldisable [add/remove] [command/category]')] });

        const data = loadDevData();
        const commands = new Set();
        const categories = new Set();
        if (client && client.commands) {
            for (const c of client.commands.values()) {
                commands.add(c.data.name);
                if (c.category) categories.add(c.category);
            }
        }

        if (action === 'add') {
            if (cmd === 'globalenable' || cmd === 'globaldisable') return message.reply({ embeds: [errorEmbed('Blocked', 'Unable to globally disable this command.')] });
            if (categories.has('developer') && cmd === 'developer') return message.reply({ embeds: [errorEmbed('Blocked', 'The **developer** category cannot be disabled — it would lock developers out of these commands.')] });
            if (commands.size && !commands.has(cmd) && !categories.has(cmd)) {
                const list = [...categories].sort().join(', ');
                return message.reply({ embeds: [errorEmbed('Unknown Target', `No command or category named \`${cmd}\`. Categories: ${list}`)] });
            }
            if (data.globalDisabled.includes(cmd)) return message.reply({ embeds: [errorEmbed('Already Disabled', 'This command is **already** globally disabled.')] });
            data.globalDisabled.push(cmd);
            saveDevData(data);
            const kind = categories.has(cmd) ? ' (category)' : '';
            return message.reply({ embeds: [successEmbed(`Globally disabled **${cmd}**${kind}.`)] });
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
