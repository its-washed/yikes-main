const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needManager } = require('../../utils/staff');

module.exports = {
    permission: "bot manager",
    data: { name: 'delavatar', description: 'Deletes a specific avatar from R2 bucket and the database', usage: ',delavatar <filename>' },
    aliases: [],
    cooldown: 5,

    execute: async (message, args) => {
        if (!await needManager(message)) return;
        const avatar = args[0];
        if (!avatar) return warn(message, 'Usage: `delavatar <filename>`');
        if (!first('SELECT * FROM avatar_history WHERE avatar = ? AND user_id = ?', avatar, message.author.id)) {
            return warn(message, `Avatar \`${avatar}\` not found in your avatar history`);
        }
        try {
            run('DELETE FROM avatar_history WHERE avatar = ? AND user_id = ?', avatar, message.author.id);
        } catch (err) {
            return warn(message, 'An error occurred while deleting avatar');
        }
        return approve(message, `Successfully deleted avatar from both R2 and your avatar history\n> **Avatar:** \`${avatar}\``);
    }
};
