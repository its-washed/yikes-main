const { loadDevData, saveDevData } = require('../../utils/developer');
const { warn, approve } = require('../../utils/context');
const { needModerator, staffLog } = require('../../utils/staff');

function resolveTarget(client, token) {
    const name = String(token || '').toLowerCase();
    if (!name) return null;
    if (client.commands.has(name)) return name;
    if (client.aliases.has(name)) return client.aliases.get(name);
    for (const cmd of client.commands.values()) {
        if (cmd.category && cmd.category.toLowerCase() === name) return cmd.category;
    }
    return null;
}

module.exports = {
    permission: "bot moderator",
    data: { name: 'globalenable', description: 'Globally enable a command', usage: ',globalenable <command|category|all>' },
    aliases: ['ge'],
    cooldown: 0,

    execute: async (message, args, client) => {
        if (!await needModerator(message)) return;
        const token = String(args[0] || '').toLowerCase();
        if (!token) return warn(message, 'Usage: `globalenable <command|category|all>`');
        const data = loadDevData();
        if (token === 'all') {
            const count = data.globalDisabled.length;
            data.globalDisabled = [];
            saveDevData(data);
            await staffLog(client, message.author, 'Global enabled all commands', 'system');
            return approve(message, count ? `Enabled all **${count}** globally disabled command(s).` : 'All commands are already globally enabled.');
        }
        const target = resolveTarget(client, token);
        if (!target) return warn(message, 'Usage: `globalenable <command|category|all>`');
        if (!data.globalDisabled.includes(target)) return warn(message, `\`${target}\` is not globally disabled.`);
        data.globalDisabled = data.globalDisabled.filter(entry => entry !== target);
        saveDevData(data);
        await staffLog(client, message.author, `Global enabled \`${target}\``, 'system');
        return approve(message, `\`${target}\` has been globally enabled.`);
    }
};
