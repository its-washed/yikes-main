const { run, query } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needModerator, staffLog } = require('../../utils/staff');

function resolveCommand(message, token) {
    const name = String(token || '').toLowerCase();
    if (!name) return null;
    if (message.client.commands.has(name)) return name;
    return message.client.aliases.get(name) || null;
}

module.exports = {
    permission: "bot moderator",
    data: { name: 'globalenable', description: 'Globally enable a command', usage: ',globalenable <command|all>' },
    aliases: ['ge'],
    cooldown: 0,

    execute: async (message, args, client) => {
        if (!await needModerator(message)) return;
        const token = String(args[0] || '').toLowerCase();
        if (!token) return warn(message, 'Usage: `globalenable <command|all>`');
        if (token === 'all') {
            run('DELETE FROM global_disabled_commands');
            await staffLog(client, message.author, 'Global enabled all commands', 'system');
            return approve(message, 'All commands have been globally enabled.');
        }
        const command = resolveCommand(message, token);
        if (!command) return warn(message, 'Usage: `globalenable <command|all>`');
        run('DELETE FROM global_disabled_commands WHERE command = ?', command);
        await staffLog(client, message.author, `Global enabled \`${command}\``, 'system');
        return approve(message, `The command \`${command}\` has been globally enabled.`);
    }
};
