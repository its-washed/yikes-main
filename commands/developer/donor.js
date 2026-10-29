const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needSupporter } = require('../../utils/predicates');
const { logSystem, addRole, removeRole } = require('../../utils/manage');
const { sendCard } = require('../../utils/helpCard');

const DONOR_ROLE = '1364712418877509774';

module.exports = {
    permission: "bot supporter",
    data: { name: 'donor', description: 'Donor commands', usage: ',donor <add|remove>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'remove'],
    subUsages: {
        add: ',donor add <member>',
        remove: ',donor remove <member>'
    },
    execute: async (message, args, client) => {
        if (!await needSupporter(message)) return;
        return sendCard(message, module.exports);
    },
    subs: {
        add: {
            aliases: [],
            data: { name: 'donor add', description: 'Add donator perks to a member', usage: ',donor add <member>' },
            execute: async (message, args, client) => {
                if (!await needSupporter(message)) return;
                const member = message.mentions.users.first();
                if (!member) return warn(message, 'Usage: `donor add <member>`');
                const check = first('SELECT * FROM donor WHERE user_id = ?', member.id);
                if (check) return warn(message, 'This member is **already** a donor');
                await addRole(client, member, DONOR_ROLE);
                run('INSERT INTO donor (user_id, timestamp, status) VALUES (?, ?, ?)', member.id, Date.now() / 1000, 'purchased');
                await logSystem(client, message.author, `Added **donator** to \`${member.username}\``);
                return approve(message, `${member} can use donator perks now!`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'donor remove', description: 'Remove donator perks from a member', usage: ',donor remove <member>' },
            execute: async (message, args, client) => {
                if (!await needSupporter(message)) return;
                const member = message.mentions.users.first();
                if (!member) return warn(message, 'Usage: `donor remove <member>`');
                const check = first("SELECT * FROM donor WHERE user_id = ? AND status = 'purchased'", member.id);
                if (!check) return warn(message, "This member can't have their perks removed");
                await removeRole(client, member, DONOR_ROLE);
                run('DELETE FROM donor WHERE user_id = ?', member.id);
                await logSystem(client, message.author, `Removed **donator** from \`${member.username}\``);
                return approve(message, `Removed ${member}'s perks`);
            }
        }
    }
};
