const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needManager } = require('../../utils/staff');

module.exports = {
    permission: "bot manager",
    data: { name: 'delvouch', description: 'Delete a vouch', usage: ',delvouch <id>' },
    aliases: [],
    cooldown: 0,

    execute: async (message, args) => {
        if (!await needManager(message)) return;
        const vouchId = parseInt(args[0], 10);
        if (!Number.isInteger(vouchId)) return warn(message, 'Usage: `delvouch <id>`');
        if (!first('SELECT id FROM vouches WHERE id = ?', vouchId)) {
            return warn(message, `Vouch with ID **${vouchId}** not found`);
        }
        run('DELETE FROM vouches WHERE id = ?', vouchId);
        return approve(message, `Vouch with ID **${vouchId}** deleted successfully`);
    }
};
