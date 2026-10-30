const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { loadDevData, saveDevData } = require('../../utils/developer');
const { needModerator, staffLog } = require('../../utils/staff');

module.exports = {
    permission: "bot moderator",
    data: { name: 'globaldisable', description: "Globally disable a command", usage: ',globaldisable [add/remove] [command/category]' },
    aliases: ["gd"],
    cooldown: 0,
    async execute(message, args, client) {
        if (!await needModerator(message)) return;

        const action = String(args[0] || '').toLowerCase();
        const cmd = String(args[1] || '').toLowerCase();

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
            if (cmd === 'developer') return message.reply({ embeds: [errorEmbed('Blocked', 'The **developer** category cannot be disabled — it would lock developers out of these commands.')] });
            if (commands.size && !commands.has(cmd) && !categories.has(cmd)) {
                const list = [...categories].sort().join(', ');
                return message.reply({ embeds: [errorEmbed('Unknown Target', `No command or category named \`${cmd}\`. Categories: ${list}`)] });
            }
            if (data.globalDisabled.includes(cmd)) return message.reply({ embeds: [errorEmbed('Already Disabled', 'This command is **already** globally disabled.')] });
            data.globalDisabled.push(cmd);
            saveDevData(data);
            const kind = categories.has(cmd) ? ' (category)' : '';
            await staffLog(client, message.author, `Global disabled \`${cmd}\`${kind}`, 'system');
            return message.reply({ embeds: [successEmbed(`Globally disabled **${cmd}**${kind}.`)] });
        } else if (action === 'remove') {
            if (!data.globalDisabled.includes(cmd)) return message.reply({ embeds: [errorEmbed('Not Disabled', `\`${cmd}\` is not globally disabled.`)] });
            data.globalDisabled = data.globalDisabled.filter(c => c !== cmd);
            saveDevData(data);
            await staffLog(client, message.author, `Global enabled \`${cmd}\``, 'system');
            return message.reply({ embeds: [successEmbed(`Globally enabled **${cmd}**.`)] });
        } else {
            return message.reply({ embeds: [errorEmbed('Invalid Action', 'Use `add` or `remove`.')] });
        }
    }
};
