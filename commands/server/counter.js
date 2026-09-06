const { PermissionFlagsBits, ChannelType, OverwriteType } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'counter',
        description: 'Create counter channels that display server stats',
        usage: ',counter [setup|disable|add|remove|list]'
    },
    aliases: ['counters', 'statschannel'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const action = args[0]?.toLowerCase();

        if (!action || action === 'status' || action === 'list') {
            const counters = config.counters?.channels || [];
            if (counters.length === 0) {
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Counters', description: 'No counter channels configured.\nUse `,counter add [type] [#channel]` to create one.' })] });
            }

            const list = counters.map(c => {
                const channel = message.guild.channels.cache.get(c.channelId);
                return `**${c.type}** — ${channel ? channel : 'Deleted'} (ID: \`${c.channelId}\`)`;
            }).join('\n');

            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Counter Channels (${counters.length})`, description: list })] });
        }

        if (action === 'add') {
            const type = args[1]?.toLowerCase();
            const validTypes = ['members', 'online', 'channels', 'roles', 'bots', 'boosts'];

            if (!type || !validTypes.includes(type)) {
                return message.reply({ embeds: [errorEmbed('Invalid Type', `Valid types: ${validTypes.join(', ')}`)] });
            }

            try {
                const category = message.guild.channels.cache.find(c => c.name.toLowerCase() === 'counters' && c.type === ChannelType.GuildCategory);
                let parent = category;

                if (!parent) {
                    parent = await message.guild.channels.create({
                        name: 'Counters',
                        type: ChannelType.GuildCategory
                    });
                }

                const channel = await message.guild.channels.create({
                    name: getChannelName(type, message.guild),
                    type: ChannelType.GuildVoice,
                    parent: parent.id,
                    permissionOverwrites: [{
                        id: message.guild.id,
                        type: OverwriteType.Role,
                        deny: ['Connect', 'Speak']
                    }]
                });

                const counters = config.counters?.channels || [];
                counters.push({ type, channelId: channel.id });
                updateGuildConfig(message.guild.id, { counters: { enabled: true, channels: counters } });

                return message.reply({ embeds: [successEmbed('Counter Created', `Created **${type}** counter in ${channel}.`)] });
            } catch (error) {
                return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
            }
        }

        if (action === 'remove') {
            const channelId = args[1]?.replace(/[<#>]/g, '');
            if (!channelId) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Mention the counter channel to remove.')] });

            const counters = config.counters?.channels || [];
            const idx = counters.findIndex(c => c.channelId === channelId);
            if (idx === -1) return message.reply({ embeds: [errorEmbed('Not Found', 'That channel is not a counter.')] });

            const removed = counters.splice(idx, 1)[0];
            updateGuildConfig(message.guild.id, { counters: { enabled: counters.length > 0, channels: counters } });

            try {
                const channel = message.guild.channels.cache.get(removed.channelId);
                if (channel) await channel.delete();
            } catch {}

            return message.reply({ embeds: [successEmbed('Counter Removed', `Removed **${removed.type}** counter.`)] });
        }

        if (action === 'disable') {
            updateGuildConfig(message.guild.id, { counters: { enabled: false, channels: [] } });
            return message.reply({ embeds: [successEmbed('Counters Disabled', 'All counter channels removed.')] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Valid: `add`, `remove`, `list`, `disable`')] });
    }
};

function getChannelName(type, guild) {
    switch (type) {
        case 'members': return `Members: ${guild.memberCount}`;
        case 'online': return `Online: ${guild.members.cache.filter(m => m.presence?.status !== 'offline').size}`;
        case 'channels': return `Channels: ${guild.channels.cache.size}`;
        case 'roles': return `Roles: ${guild.roles.cache.size}`;
        case 'bots': return `Bots: ${guild.members.cache.filter(m => m.user.bot).size}`;
        case 'boosts': return `Boosts: ${guild.premiumSubscriptionCount || 0}`;
        default: return 'Counter';
    }
}
