const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerks } = require('../../utils/predicates');
const { sendCard } = require('../../utils/helpCard');

function commandExists(client, name) {
    if (client.commands.has(name)) return true;
    if (client.aliases.has(name)) return true;
    return false;
}

module.exports = {
    permission: "donator",
    data: { name: 'selfalias', description: 'Create your own shortcuts for commands', usage: ',selfalias <add|remove|list>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list'],
    subUsages: {
        add: ',selfalias add <alias> <command> [args]',
        remove: ',selfalias remove <alias>',
        list: ',selfalias list'
    },
    execute: async (message, args, client) => {
        if (!await needPerks(message, client)) return;
        return sendCard(message, module.exports);
    },
    subs: {
        add: {
            aliases: [],
            data: { name: 'selfalias add', description: 'Create or update a selfalias for command', usage: ',selfalias add <alias> <command> [args]' },
            execute: async (message, args, client) => {
                if (!await needPerks(message, client)) return;
                const alias = args[0];
                const command = args[1];
                const cmdArgs = args.slice(2).join(' ').trim() || null;
                if (!alias || !command) return warn(message, 'Usage: `selfalias add <alias> <command> [args]`');
                if (!commandExists(client, command)) return warn(message, `\`${command}\` is not a command`);
                if (commandExists(client, alias)) return warn(message, `\`${alias}\` is already a command`);
                const exists = first('SELECT alias FROM selfaliases WHERE user_id = ? AND alias = ?', message.author.id, alias);
                if (exists) {
                    run('UPDATE selfaliases SET command = ?, args = ? WHERE user_id = ? AND alias = ?', command, cmdArgs, message.author.id, alias);
                    return approve(message, `Updated \`${alias}\` to now alias \`${command}\``);
                }
                const count = query('SELECT alias FROM selfaliases WHERE user_id = ?', message.author.id);
                if (count.length >= 75) return warn(message, 'You can only have **75 selfaliases**');
                run('INSERT INTO selfaliases (user_id, command, alias, args) VALUES (?, ?, ?, ?)', message.author.id, command, alias, cmdArgs);
                return approve(message, `Added \`${alias}\` as an alias for \`${command}\``);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'selfalias remove', description: 'Remove an selfalias for command', usage: ',selfalias remove <alias>' },
            execute: async (message, args) => {
                if (!await needPerks(message, message.client)) return;
                const alias = args.join(' ').trim();
                if (!alias) return warn(message, 'Usage: `selfalias remove <alias>`');
                const check = first('SELECT * FROM selfaliases WHERE user_id = ? AND alias = ?', message.author.id, alias);
                if (!check) return warn(message, `\`${alias}\` is **not** an alias`);
                run('DELETE FROM selfaliases WHERE user_id = ? AND alias = ?', message.author.id, alias);
                return approve(message, `Removed the **alias** \`${alias}\``);
            }
        },
        list: {
            aliases: [],
            data: { name: 'selfalias list', description: 'List every selfalias for all commands', usage: ',selfalias list' },
            execute: async (message, args, client) => {
                if (!await needPerks(message, client)) return;
                const results = query('SELECT * FROM selfaliases WHERE user_id = ?', message.author.id);
                if (!results.length) return warn(message, 'No **selfaliases** are set');
                const lines = results.map(r => `**${r.alias}** - \`${r.command}${r.args ? ' ' + r.args : ''}\``);
                return paginate(message, lines, 'Selfaliases',
                    { name: message.guild.name, icon_url: message.guild.iconURL({ size: 256 }) || undefined });
            }
        }
    }
};
