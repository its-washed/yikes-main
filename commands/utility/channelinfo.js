const { warn } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');

function findChannel(message, value) {
    if (!value) return message.channel;
    const raw = String(value).trim();
    const mentioned = message.mentions.channels.first();
    if (mentioned && (raw.includes(mentioned.id) || raw === `<#${mentioned.id}>`)) return mentioned;

    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) {
        const byId = message.guild.channels.cache.get(id);
        if (byId) return byId;
        for (const guild of message.client.guilds.cache.values()) {
            const found = guild.channels.cache.get(id);
            if (found) return found;
        }
        return null;
    }

    for (const guild of message.client.guilds.cache.values()) {
        const byName = guild.channels.cache.find(channel => channel.name === raw);
        if (byName) return byName;
    }
    return null;
}

module.exports = {
    data: { name: 'channelinfo', description: "View information about a channel", usage: ',channelinfo #general', params: ['[channel]'] },
    aliases: ['ci'],
    cooldown: 3,

    async execute(message, args) {
        const channel = findChannel(message, args.join(' '));
        if (!channel) return warn(message, 'An error occurred while fetching the channel');

        const fields = [
            { name: 'Channel ID', value: `\`${channel.id}\``, inline: true },
            { name: 'Type', value: `${channel.type}`.replace(/_/g, ' '), inline: true },
            { name: 'Guild', value: `${channel.guild.name} (\`${channel.guild.id}\`)`, inline: true }
        ];

        if (channel.parent) {
            fields.push({ name: 'Category', value: `${channel.parent.name} (\`${channel.parent.id}\`)`, inline: true });
        } else {
            fields.push({ name: 'Category', value: 'None', inline: true });
        }

        if (channel.isThread && channel.isThread()) {
            fields.push({ name: 'Parent Channel', value: `${channel.parent ? `${channel.parent.name} (\`${channel.parent.id}\`)` : 'None'}`, inline: true });
        } else if (channel.type === 15) {
            const tags = (channel.availableTags || []).map(tag => `\`${tag.name}\``).join(', ');
            fields.push({ name: 'Available Tags', value: tags || 'None', inline: true });
            fields.push({ name: 'Post Guidelines', value: channel.topic ? `\`\`\`${channel.topic}\`\`\`` : 'No guidelines', inline: false });
        } else if (channel.topic !== undefined && channel.topic !== null) {
            fields.push({ name: 'Topic', value: `${channel.topic}` || 'No topic', inline: false });
        }

        fields.push({
            name: 'Created At',
            value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:F> (<t:${Math.floor(channel.createdTimestamp / 1000)}:R>)`,
            inline: false
        });

        return message.reply({
            embeds: [{
                color: COLORS.NEUTRAL,
                title: channel.name,
                author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
                fields
            }]
        });
    }
};
