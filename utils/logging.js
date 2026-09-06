const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('./config');

function getLogChannel(guild) {
    const config = getGuildConfig(guild.id);
    if (!config.logChannel) return null;
    return guild.channels.cache.get(config.logChannel);
}

function sendLog(guild, embed) {
    const channel = getLogChannel(guild);
    if (!channel) return;
    channel.send({ embeds: [embed] }).catch(() => {});
}

function logChannelCreate(channel) {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('Channel Created')
        .addFields(
            { name: 'Name', value: `${channel}`, inline: true },
            { name: 'Type', value: channel.type.toString(), inline: true },
            { name: 'ID', value: channel.id, inline: true }
        )
        .setTimestamp();
    sendLog(channel.guild, embed);
}

function logChannelDelete(channel) {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
        .setColor(0xff4757)
        .setTitle('Channel Deleted')
        .addFields(
            { name: 'Name', value: channel.name, inline: true },
            { name: 'Type', value: channel.type.toString(), inline: true },
            { name: 'ID', value: channel.id, inline: true }
        )
        .setTimestamp();
    sendLog(channel.guild, embed);
}

function logChannelUpdate(oldChannel, newChannel) {
    if (!oldChannel.guild) return;
    const changes = [];
    if (oldChannel.name !== newChannel.name) changes.push(`Name: \`${oldChannel.name}\` → \`${newChannel.name}\``);
    if (oldChannel.topic !== newChannel.topic) changes.push(`Topic updated`);
    if (oldChannel.nsfw !== newChannel.nsfw) changes.push(`NSFW: ${oldChannel.nsfw} → ${newChannel.nsfw}`);
    if (!changes.length) return;
    const embed = new EmbedBuilder()
        .setColor(0xfbbf24)
        .setTitle('Channel Updated')
        .setDescription(changes.join('\n'))
        .setTimestamp();
    sendLog(newChannel.guild, embed);
}

function logMessageDelete(message) {
    if (!message.guild || message.author?.bot) return;
    const embed = new EmbedBuilder()
        .setColor(0xff4757)
        .setTitle('Message Deleted')
        .addFields(
            { name: 'Author', value: `${message.author} (${message.author.id})`, inline: true },
            { name: 'Channel', value: `${message.channel}`, inline: true },
            { name: 'Content', value: message.content?.slice(0, 1024) || '*No text content*' }
        )
        .setTimestamp();
    if (message.attachments.size) {
        embed.addFields({ name: 'Attachments', value: message.attachments.size.toString(), inline: true });
    }
    sendLog(message.guild, embed);
}

function logMessageUpdate(oldMessage, newMessage) {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    const embed = new EmbedBuilder()
        .setColor(0xfbbf24)
        .setTitle('Message Edited')
        .addFields(
            { name: 'Author', value: `${oldMessage.author}`, inline: true },
            { name: 'Channel', value: `${oldMessage.channel}`, inline: true },
            { name: 'Before', value: oldMessage.content?.slice(0, 512) || '*empty*', inline: false },
            { name: 'After', value: newMessage.content?.slice(0, 512) || '*empty*', inline: false }
        )
        .setTimestamp();
    sendLog(oldMessage.guild, embed);
}

function logMemberJoin(member) {
    const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('Member Joined')
        .addFields(
            { name: 'User', value: `${member} (${member.id})`, inline: true },
            { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'Member Count', value: member.guild.memberCount.toString(), inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
        .setTimestamp();
    sendLog(member.guild, embed);
}

function logMemberRemove(member) {
    const embed = new EmbedBuilder()
        .setColor(0xff4757)
        .setTitle('Member Left')
        .addFields(
            { name: 'User', value: `${member} (${member.id})`, inline: true },
            { name: 'Roles', value: member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r).join(', ') || 'None', inline: true },
            { name: 'Member Count', value: member.guild.memberCount.toString(), inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
        .setTimestamp();
    sendLog(member.guild, embed);
}

function logRoleCreate(role) {
    if (!role.guild) return;
    const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('Role Created')
        .addFields(
            { name: 'Name', value: `${role}`, inline: true },
            { name: 'Color', value: role.hexColor, inline: true },
            { name: 'ID', value: role.id, inline: true }
        )
        .setTimestamp();
    sendLog(role.guild, embed);
}

function logRoleDelete(role) {
    if (!role.guild) return;
    const embed = new EmbedBuilder()
        .setColor(0xff4757)
        .setTitle('Role Deleted')
        .addFields(
            { name: 'Name', value: role.name, inline: true },
            { name: 'Color', value: role.hexColor, inline: true },
            { name: 'ID', value: role.id, inline: true }
        )
        .setTimestamp();
    sendLog(role.guild, embed);
}

function logRoleUpdate(oldRole, newRole) {
    if (!oldRole.guild) return;
    const changes = [];
    if (oldRole.name !== newRole.name) changes.push(`Name: \`${oldRole.name}\` → \`${newRole.name}\``);
    if (oldRole.color !== newRole.color) changes.push(`Color: ${oldRole.hexColor} → ${newRole.hexColor}`);
    if (oldRole.hoist !== newRole.hoist) changes.push(`Hoist: ${oldRole.hoist} → ${newRole.hoist}`);
    if (oldRole.mentionable !== newRole.mentionable) changes.push(`Mentionable: ${oldRole.mentionable} → ${newRole.mentionable}`);
    if (!changes.length) return;
    const embed = new EmbedBuilder()
        .setColor(0xfbbf24)
        .setTitle('Role Updated')
        .setDescription(changes.join('\n'))
        .setTimestamp();
    sendLog(newRole.guild, embed);
}

function logVoiceStateUpdate(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;
    const changes = [];
    if (!oldState.channel && newState.channel) changes.push(`Joined **${newState.channel.name}**`);
    else if (oldState.channel && !newState.channel) changes.push(`Left **${oldState.channel.name}**`);
    else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) changes.push(`Moved from **${oldState.channel.name}** → **${newState.channel.name}**`);
    if (oldState.mute !== newState.mute) changes.push(`Mute: ${newState.mute ? 'ON' : 'OFF'}`);
    if (oldState.deaf !== newState.deaf) changes.push(`Deaf: ${newState.deaf ? 'ON' : 'OFF'}`);
    if (!changes.length) return;
    const embed = new EmbedBuilder()
        .setColor(0x6c5ce7)
        .setTitle('Voice Update')
        .addFields(
            { name: 'User', value: `${member}`, inline: true },
            { name: 'Changes', value: changes.join('\n'), inline: false }
        )
        .setTimestamp();
    sendLog(newState.guild, embed);
}

module.exports = {
    logChannelCreate,
    logChannelDelete,
    logChannelUpdate,
    logMessageDelete,
    logMessageUpdate,
    logMemberJoin,
    logMemberRemove,
    logRoleCreate,
    logRoleDelete,
    logRoleUpdate,
    logVoiceStateUpdate
};
