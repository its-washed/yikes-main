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
    data: { name: 'disablemodule', description: 'Disable a module in the server or a specific channel.', usage: ',disablemodule all leveling', params: ['scope', 'module'] },
    aliases: ['dmodule'],
    cooldown: 5,

    async execute(message, args) {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
        const scope = args[0];
        const module = String(args[1] || '').toLowerCase();
        if (!scope || !module) return warn(message, 'You must provide a scope and module\n> Usage: `,disablemodule all leveling`');
        if (!MODULES.includes(module)) return warn(message, `Invalid module\n> Valid: ${MODULES.map((entry) => `\`${entry}\``).join(', ')}`);
        const parsed = resolveScope(message, scope);
        if (parsed.error) return warn(message, parsed.error);

        if (parsed.all) {
            if (first('SELECT 1 AS ok FROM guild_disabled_module WHERE guild_id = ? AND module = ?', message.guild.id, module)) {
                return warn(message, 'This module is **already** disabled for the server');
            }
            run('INSERT INTO guild_disabled_module (guild_id, module) VALUES (?, ?)', message.guild.id, module);
            return approve(message, `Successfully disabled \`${module}\` for the server`);
        }
        if (first('SELECT 1 AS ok FROM channel_disabled_module WHERE channel_id = ? AND module = ?', parsed.channelId, module)) {
            return warn(message, `Module \`${module}\` is **already** disabled in <#${parsed.channelId}>`);
        }
        run('INSERT INTO channel_disabled_module (guild_id, channel_id, module) VALUES (?, ?, ?)', message.guild.id, parsed.channelId, module);
        return approve(message, `Successfully disabled \`${module}\` in <#${parsed.channelId}>`);
    }
};
