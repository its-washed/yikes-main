const { PermissionFlagsBits } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { first, run } = require('../../utils/database');

function resolveScope(message, scope) {
    if (String(scope).toLowerCase() === 'all') return { all: true };
    const id = String(scope).replace(/[<#>]/g, '');
    if (!/^\d{17,20}$/.test(id)) return { error: 'Invalid channel specified. Please mention a **valid** channel or use **all**' };
    return { channelId: id };
}

module.exports = {
    permission: "manage guild",
    data: { name: 'disablecmd', description: 'Disable a command in the server or a specific channel.', usage: ',disablecmd all userinfo', params: ['scope', 'command'] },
    aliases: ['dcmd'],
    cooldown: 5,

    async execute(message, args) {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
        const scope = args[0];
        const command = String(args[1] || '').toLowerCase();
        if (!scope || !command) return warn(message, 'You must provide a scope and command\n> Usage: `,disablecmd all userinfo`');
        const parsed = resolveScope(message, scope);
        if (parsed.error) return warn(message, parsed.error);

        if (parsed.all) {
            if (first('SELECT 1 AS ok FROM guild_disabled_commands WHERE guild_id = ? AND cmd = ?', message.guild.id, command)) {
                return warn(message, 'This command is **already** disabled for the server');
            }
            run('INSERT INTO guild_disabled_commands (guild_id, cmd) VALUES (?, ?)', message.guild.id, command);
            return approve(message, `Successfully disabled \`${command}\` for the server`);
        }
        if (first('SELECT 1 AS ok FROM channel_disabled_commands WHERE channel_id = ? AND cmd = ?', parsed.channelId, command)) {
            return warn(message, `Command \`${command}\` is **already** disabled in <#${parsed.channelId}>`);
        }
        run('INSERT INTO channel_disabled_commands (guild_id, channel_id, cmd) VALUES (?, ?, ?)', message.guild.id, parsed.channelId, command);
        return approve(message, `Successfully disabled \`${command}\` in <#${parsed.channelId}>`);
    }
};
