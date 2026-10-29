const { query } = require('../../utils/database');
const { warn } = require('../../utils/context');
const { needSupporter } = require('../../utils/predicates');
const { COLORS } = require('../../utils/styles');

module.exports = {
    permission: "bot supporter",
    data: { name: 'error', description: 'View information about an error code', usage: ',trace A1Y2Pu', params: ['code'] },
    aliases: ['trace'],
    cooldown: 5,

    async execute(message, args, client) {
        if (!await needSupporter(message)) return;
        const code = args[0];
        if (!code || code.length !== 6) return warn(message, 'Please provide a **valid** error code');
        const rows = query('SELECT * FROM error_codes');
        const details = rows.find(r => r.code === code);
        if (!details) return warn(message, 'Please provide a **valid** error code');
        let info;
        try {
            info = JSON.parse(details.info);
        } catch {
            return warn(message, 'Please provide a **valid** error code');
        }
        const guild = client.guilds.cache.get(String(info.guild_id));
        return message.reply({
            embeds: [{
                color: COLORS.NEUTRAL,
                description: String(info.error),
                author: { name: `Error Code: ${code}` },
                fields: [
                    { name: 'Guild', value: `${guild ? guild.name : 'Unknown'}\n\`${guild ? guild.id : info.guild_id}\``, inline: true },
                    { name: 'Channel', value: `<#${info.channel_id}>\n\`${info.channel_id}\``, inline: true },
                    { name: 'User', value: `<@${info.user_id}>\n\`${info.user_id}\``, inline: true },
                    { name: 'Command', value: `**${info.command}**` },
                    { name: 'Timestamp', value: `${info.timestamp}` }
                ]
            }]
        });
    }
};
