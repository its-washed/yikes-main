const { query } = require('../../utils/database');
const { warn, paginate } = require('../../utils/context');
const { needModerator } = require('../../utils/staff');

module.exports = {
    permission: "bot moderator",
    data: { name: 'globaldisabled', description: 'Show all commands that are globally disabled', usage: ',globaldisabled' },
    aliases: ['gdl'],
    cooldown: 0,

    execute: async (message) => {
        if (!await needModerator(message)) return;
        const rows = query('SELECT command FROM dev_disabled ORDER BY command');
        if (!rows.length) return warn(message, 'There are no globally disabled commands.');
        const lines = rows.map(row => `- \`${row.command}\``);
        return paginate(message, lines, 'Globally Disabled Commands:', { name: message.guild.name, icon_url: message.guild.iconURL({ size: 256 }) || undefined });
    }
};
