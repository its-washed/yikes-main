const { warn, approve } = require('../../utils/context');
const { permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { first, run } = require('../../utils/database');

const ALLOWED_ROLES = new Set(['1554433468711178310', '1527933609384874106', '660204203834081284', '659438962624167957']);

module.exports = {
    permission: "bot developer",
    data: { name: 'termed', description: 'Transfer data from old user to new user', usage: ',termed <old> <new>' },
    cooldown: 0,

    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        const mentioned = message.mentions.users.array();
        let oldUser = mentioned[0] || null;
        let newUser = mentioned[1] || null;
        const ids = args.filter(a => /^\d{17,20}$/.test(a));
        for (const id of ids) {
            const user = message.client.users.cache.get(id);
            if (!oldUser) oldUser = user;
            else if (!newUser) newUser = user;
        }
        if (!oldUser || !newUser) return warn(message, 'Usage: `termed <old user> <new user>`');

        let details = '';

        const oldMember = message.guild.members.cache.get(oldUser.id);
        const newMember = message.guild.members.cache.get(newUser.id);
        if (oldMember && newMember) {
            const transferable = oldMember.roles.cache.filter(role => ALLOWED_ROLES.has(role.id));
            if (transferable.size) {
                try {
                    await oldMember.roles.remove(transferable, 'Data transfer');
                    await newMember.roles.add(transferable, 'Data transfer');
                    details += `**Roles:** ${transferable.map(role => role.toString()).join(', ')}\n`;
                } catch (err) {
                    details += `**Roles:** Failed to transfer (${err.message})\n`;
                }
            } else {
                details += '**Roles:** No allowed roles found to transfer\n';
            }
        } else {
            details += '**Roles:** Not found\n';
        }

        const oldEconomy = first('SELECT * FROM economy WHERE user_id = ?', oldUser.id);
        const newEconomy = first('SELECT * FROM economy WHERE user_id = ?', newUser.id);
        if (oldEconomy) {
            if (!newEconomy) {
                run('UPDATE economy SET user_id = ? WHERE user_id = ?', newUser.id, oldUser.id);
                details += '**Economy:** Transferred\n';
            } else {
                run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', oldEconomy.cash || 0, newUser.id);
                run('UPDATE economy SET card = card + ? WHERE user_id = ?', oldEconomy.card || 0, newUser.id);
                run('UPDATE economy SET item_bank = item_bank + ? WHERE user_id = ?', oldEconomy.item_bank || 0, newUser.id);
                run('UPDATE economy SET item_case = item_case + ? WHERE user_id = ?', oldEconomy.item_case || 0, newUser.id);
                run('DELETE FROM economy WHERE user_id = ?', oldUser.id);
                details += '**Economy:** Merged\n';
            }
        }

        const oldBusiness = first('SELECT * FROM economy_business WHERE user_id = ?', oldUser.id);
        if (oldBusiness) {
            const newBusiness = first('SELECT * FROM economy_business WHERE user_id = ?', newUser.id);
            if (!newBusiness) {
                run('UPDATE economy_business SET user_id = ? WHERE user_id = ?', newUser.id, oldUser.id);
            } else {
                run('DELETE FROM economy_business WHERE user_id = ?', oldUser.id);
            }
            details += '**Business:** Transferred\n';
        }

        const oldLab = first('SELECT * FROM economy_lab WHERE user_id = ?', oldUser.id);
        if (oldLab) {
            const newLab = first('SELECT * FROM economy_lab WHERE user_id = ?', newUser.id);
            if (!newLab) {
                run('UPDATE economy_lab SET user_id = ? WHERE user_id = ?', newUser.id, oldUser.id);
            } else {
                run('DELETE FROM economy_lab WHERE user_id = ?', oldUser.id);
            }
            details += '**Lab:** Transferred\n';
        } else {
            details += '**Lab:** Not found\n';
        }

        const oldPremium = first('SELECT * FROM premium WHERE user_id = ?', oldUser.id);
        if (oldPremium) {
            run('UPDATE premium SET user_id = ? WHERE user_id = ?', newUser.id, oldUser.id);
            details += '**Premium:** Transferred\n';
        } else {
            details += '**Premium:** Not found\n';
        }

        const oldInstance = first('SELECT * FROM instance WHERE owner_id = ?', oldUser.id);
        if (oldInstance) {
            run('UPDATE instance SET owner_id = ? WHERE owner_id = ?', newUser.id, oldUser.id);
            run('UPDATE instance_addon SET owner_id = ? WHERE owner_id = ?', newUser.id, oldUser.id);
            details += '**Instance:** Transferred\n';
        } else {
            details += '**Instance:** Not found\n';
        }

        const oldDonor = first('SELECT * FROM donor WHERE user_id = ?', oldUser.id);
        if (oldDonor) {
            const newDonor = first('SELECT 1 AS ok FROM donor WHERE user_id = ?', newUser.id);
            if (newDonor) run('DELETE FROM donor WHERE user_id = ?', oldUser.id);
            else run('UPDATE donor SET user_id = ? WHERE user_id = ?', newUser.id, oldUser.id);
            details += '**Donor:** Transferred\n';
        } else {
            details += '**Donor:** Not found\n';
        }

        const oldAntinuke = first('SELECT * FROM antinuke WHERE owner_id = ?', oldUser.id);
        if (oldAntinuke) {
            run('UPDATE antinuke SET owner_id = ? WHERE owner_id = ?', newUser.id, oldUser.id);
            details += '**Antinuke:** Transferred\n';
        } else {
            details += '**Antinuke:** Not found\n';
        }

        const oldBugs = first('SELECT * FROM bugreports WHERE user_id = ?', oldUser.id);
        if (oldBugs) {
            run('UPDATE bugreports SET user_id = ? WHERE user_id = ?', newUser.id, oldUser.id);
            details += '**Bugreports:** Transferred\n';
        } else {
            details += '**Bugreports:** Not found\n';
        }

        return approve(message, `Successfully transferred data from ${oldUser} to ${newUser}\n${details}`);
    }
};
