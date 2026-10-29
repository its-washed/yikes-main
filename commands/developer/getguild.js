const { warn } = require('../../utils/context');
const { permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { COLORS } = require('../../utils/styles');

const VERIFICATION = ['None', 'Low', 'Medium', 'High', 'Highest'];

function resolveGuild(message, args) {
    const mention = message.mentions.guilds.first() || message.mentions.channels.first();
    if (mention && mention.guild) return mention.guild;
    const match = /(\d{17,20})/.exec(String(args[0] || ''));
    if (match) return message.client.guilds.cache.get(match[1]) || null;
    return null;
}

module.exports = {
    data: { name: 'getguild', description: 'Fetch information on a guild.', usage: ',getguild <guild>' },
    cooldown: 0,

    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        const guild = resolveGuild(message, args);
        if (!guild) return warn(message, 'Could not find that guild');

        const ownerMember = guild.members.cache.get(guild.ownerId);
        const icon = guild.iconURL({ size: 2048 });

        const embed = {
            color: COLORS.NEUTRAL,
            description: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`,
            author: {
                name: `${guild.name} (${guild.id})`,
                url: guild.vanityURLCode ? `https://discord.gg/${guild.vanityURLCode}` : undefined,
                icon_url: icon || undefined
            },
            fields: [
                {
                    name: '**Information**',
                    value: [
                        `**Owner:** ${ownerMember ? ownerMember.user.username : guild.ownerId}`,
                        `**Verification:** ${VERIFICATION[guild.verificationLevel] || 'Unknown'}`,
                        `**Nitro Boosts:** ${Number(guild.premiumSubscriptionCount || 0).toLocaleString('en-US')} (\`Level ${guild.premiumTier}\`)`
                    ].join('\n')
                },
                {
                    name: '**Statistics**',
                    value: [
                        `**Members:** ${Number(guild.memberCount).toLocaleString('en-US')}`,
                        `**Text Channels:** ${guild.channels.cache.filter(c => c.isTextBased()).size.toLocaleString('en-US')}`,
                        `**Voice Channels:** ${guild.channels.cache.filter(c => c.isVoiceBased()).size.toLocaleString('en-US')}`
                    ].join('\n')
                }
            ]
        };

        if (guild.id === message.guild.id) {
            const roles = [...guild.roles.cache.values()].slice(1).reverse();
            if (roles.length) {
                embed.fields.push({
                    name: `**Roles (${roles.length})**`,
                    inline: false,
                    value: roles.slice(0, 5).map(role => `${role}`).join(', ') + (roles.length > 5 ? ` (+${roles.length - 5})` : '')
                });
            }
        }

        return message.reply({ embeds: [embed] });
    }
};
