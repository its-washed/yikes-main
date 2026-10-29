const { PermissionFlagsBits } = require('discord.js');
const { warn, paginate } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { query } = require('../../utils/database');

module.exports = {
    permission: "Manage guild",
    data: { name: 'disabledcmds', description: 'View all disabled commands in the server', usage: ',disabledcmds' },
    aliases: ['dcmds'],
    cooldown: 5,

    async execute(message) {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
        const channelDisabled = query('SELECT cmd, channel_id FROM channel_disabled_commands WHERE guild_id = ?', message.guild.id);
        const guildDisabled = query('SELECT cmd FROM guild_disabled_commands WHERE guild_id = ?', message.guild.id);

        const channelList = channelDisabled.length
            ? channelDisabled.map((entry, index) => `\`${index + 1}.\` **${entry.cmd}** - <#${entry.channel_id}>`).join('\n')
            : `${EMOJIS.WARNING} No disabled commands for specific channels.`;
        const guildList = guildDisabled.length
            ? guildDisabled.map((entry, index) => `\`${index + 1}.\` **${entry.cmd}**`).join('\n')
            : `${EMOJIS.WARNING} No disabled commands for this server.`;

        const embeds = [
            {
                color: channelDisabled.length ? COLORS.NEUTRAL : COLORS.WARNING,
                title: 'Disabled Commands - Channels',
                description: channelList
            },
            {
                color: guildDisabled.length ? COLORS.NEUTRAL : COLORS.WARNING,
                title: 'Disabled Commands - Server',
                description: guildList
            }
        ];
        const { Paginator } = require('../../utils/pagination');
        const paginator = new Paginator(embeds, { userId: message.author.id });
        const sent = await message.reply({ embeds: paginator.buildEmbeds(), components: [paginator.buildRow()] });
        await paginator.start(message.channel, sent);
        return sent;
    }
};
