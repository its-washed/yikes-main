const { warn } = require('../../utils/context');
const { isDeveloper } = require('../../utils/developer');
const { sendCard } = require('../../utils/helpCard');

module.exports = {
    data: { name: 'commands', description: 'View all commands or get help for a specific command', usage: ',commands [command]' },
    aliases: ["h","cmds"],
    cooldown: 3,

    async execute(message, args, client) {
        if (!args[0]) {
            const help = client.commands.get('help');
            if (help) return help.execute(message, [], client);
            return warn(message, 'Help is unavailable right now');
        }

        const name = args[0].toLowerCase();
        const cmd = client.commands.get(name) || client.commands.find(c => c.aliases && c.aliases.includes(name));
        if (!cmd) return warn(message, `No command called \`${name}\` found`);

        const staffOnly = ['developer'];
        if (staffOnly.includes(cmd.category) && !isDeveloper(message.author.id)) {
            return warn(message, `No command called \`${name}\` found`);
        }

        return sendCard(message, cmd);
    }
};
