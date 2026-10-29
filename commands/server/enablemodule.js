const { PermissionFlagsBits } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { first, run } = require('../../utils/database');

const MODULES = ['fun', 'economy', 'utility', 'moderation', 'server', 'voice', 'music', 'lastfm', 'developer', 'config'];

function resolveScope(message, scope) {
    if (String(scope).toLowerCase() === 'all') return { all: true };
    const id = String(scope).replace(/[<#>]/g, '');
    if (!/^\d{17,20}$/.test(id)) return { error: 'Invalid channel specified. Please mention a **valid** channel or use **all**' };
    return { channelId: id };
}

module.exports = {
    permission: "manage guild",
    data: { name: 'enablemodule', description: 'Enable a module in the server or a specific channel.', usage: ',enablemodule all leveling', params: ['scope', 'module'] },
    aliases: ['emodule'],
    cooldown: 5,

    async execute(message, args) {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
        const scope = args[0];
        const module = String(args[1] || '').toLowerCase();
        if (!scope || !module) return warn(message, 'You must provide a scope and module\n> Usage: `,enablemodule all leveling`');
        if (!MODULES.includes(module)) return warn(message, `Invalid module\n> Valid: ${MODULES.map((entry) => `\`${entry}\``).join(', ')}`);
        const parsed = resolveScope(message, scope);
        if (parsed.error) return warn(message, parsed.error);

        if (parsed.all) {
            if (!first('SELECT 1 AS ok FROM guild_disabled_module WHERE guild_id = ? AND module = ?', message.guild.id, module)) {
                return warn(message, 'This module is **not** disabled for the server');
            }
            run('DELETE FROM guild_disabled_module WHERE guild_id = ? AND module = ?', message.guild.id, module);
            return approve(message, `Successfully enabled \`${module}\` for the server`);
        }
        if (!first('SELECT 1 AS ok FROM channel_disabled_module WHERE channel_id = ? AND module = ?', parsed.channelId, module)) {
            return warn(message, `Module \`${module}\` is **not** disabled in <#${parsed.channelId}>`);
        }
        run('DELETE FROM channel_disabled_module WHERE channel_id = ? AND module = ?', parsed.channelId, module);
        return approve(message, `Successfully enabled \`${module}\` in <#${parsed.channelId}>`);
    }
};
