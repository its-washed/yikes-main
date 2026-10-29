const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('./config');
const { COLORS, EMOJIS } = require('./styles');

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

function guildIcon(guild) {
    return guild && guild.iconURL ? guild.iconURL({ size: 256 }) : null;
}

function avatarOf(user) {
    return user && user.avatarURL ? user.avatarURL({ size: 256 }) : null;
}

function stamp(ms) {
    return `<t:${Math.floor(ms / 1000)}:f>`;
}

function stampRelative(ms) {
    return `<t:${Math.floor(ms / 1000)}:R>`;
}

async function auditActor(guild, actionType) {
    try {
        const logs = await guild.fetchAuditLogs({ type: actionType, limit: 1 });
        const entry = logs.entries.first();
        return entry && entry.executor ? entry.executor : null;
    } catch (err) {
        return null;
    }
}

function logChannelCreate(channel) {
    if (!channel.guild) return;
    const guild = channel.guild;
    const embed = new EmbedBuilder()
        .setColor(COLORS.NEUTRAL)
        .setTitle('Channel Create')
        .setDescription(`<#${channel.id}> got created`)
        .setAuthor({ name: guild.name, iconURL: guildIcon(guild) || undefined })
        .addFields({ name: 'Channel', value: `**${channel.name || 'unknown'}** (\`${channel.id}\`)`, inline: false })
        .setFooter({ text: `ID: ${channel.id}` })
        .setTimestamp();
    auditActor(guild, 10).then(actor => {
        if (actor) embed.addFields({ name: 'Created by', value: `**${actor}** (\`${actor.id}\`)`, inline: false });
        sendLog(guild, embed);
    });
}

function logChannelDelete(channel) {
    if (!channel.guild) return;
    const guild = channel.guild;
    const embed = new EmbedBuilder()
        .setColor(COLORS.NEUTRAL)
        .setTitle('Channel Delete')
        .setDescription(`<#${channel.id}> got deleted`)
        .setAuthor({ name: guild.name, iconURL: guildIcon(guild) || undefined })
        .addFields({ name: 'Channel', value: `**${channel.name || 'unknown'}** (\`${channel.id}\`)`, inline: false })
        .setFooter({ text: `ID: ${channel.id}` })
        .setTimestamp();
    auditActor(guild, 12).then(actor => {
        if (actor) embed.addFields({ name: 'Deleted by', value: `**${actor}** (\`${actor.id}\`)`, inline: false });
        sendLog(guild, embed);
    });
}

function logChannelUpdate(oldChannel, newChannel) {
    if (!oldChannel.guild) return;
    const embed = new EmbedBuilder()
        .setColor(COLORS.NEUTRAL)
        .setTitle('Channel Update')
        .setFooter({ text: `ID: ${newChannel.id}` })
        .setTimestamp();

    if (oldChannel.name !== newChannel.name) {
        embed.setDescription(`<#${newChannel.id}> got a different name`)
            .addFields(
                { name: 'Before', value: oldChannel.name, inline: true },
                { name: 'After', value: newChannel.name, inline: true }
            );
    } else if (oldChannel.topic !== newChannel.topic) {
        embed.setDescription(`<#${newChannel.id}> got a different topic`)
            .addFields(
                { name: 'Before', value: oldChannel.topic || '*none*', inline: false },
                { name: 'After', value: newChannel.topic || '*none*', inline: false }
            );
    } else if (oldChannel.nsfw !== newChannel.nsfw) {
        embed.setDescription(`<#${newChannel.id}> ${newChannel.nsfw ? 'is now **NSFW**' : 'is **not NSFW** anymore'}`);
    } else if (oldChannel.type !== newChannel.type) {
        embed.setDescription(`<#${newChannel.id}> got a different type`)
            .addFields(
                { name: 'Before', value: oldChannel.type.toString(), inline: true },
                { name: 'After', value: newChannel.type.toString(), inline: true }
            );
    } else {
        return;
    }

    auditActor(newChannel.guild, 11).then(actor => {
        if (actor) embed.addFields({ name: 'Moderator', value: `**${actor}** (\`${actor.id}\`)`, inline: false });
        sendLog(newChannel.guild, embed);
    });
}

function logMessageDelete(message) {
    if (!message.guild || !message.author || message.author.bot) return;
    const embed = new EmbedBuilder()
        .setColor(COLORS.NEUTRAL)
        .setTitle('Message Deleted')
        .setDescription(message.content || 'No Content')
        .setAuthor({ name: `${message.author}`, iconURL: avatarOf(message.author) || undefined })
        .addFields({ name: 'Channel', value: `<#${message.channel.id}> (\`${message.channel.id}\`)`, inline: false })
        .setFooter({ text: `ID: ${message.id}` })
        .setTimestamp();

    const attachment = message.attachments && message.attachments.first ? message.attachments.first() : null;
    if (attachment) {
        if (/\.(png|jpe?g|gif|webp)$/i.test(attachment.name || attachment.url || '')) {
            embed.setImage(attachment.url);
        } else {
            embed.addFields({ name: 'Attachment', value: `[${attachment.name || 'file'}](${attachment.url})`, inline: false });
        }
    }
    sendLog(message.guild, embed);
}

function logMessageUpdate(oldMessage, newMessage) {
    if (!oldMessage.guild || !oldMessage.author || oldMessage.author.bot) return;
    if (oldMessage.content === newMessage.content) return;
    const before = oldMessage.content || '';
    const after = newMessage.content || '';
    const embed = new EmbedBuilder()
        .setColor(COLORS.NEUTRAL)
        .setTitle('Message Edit')
        .setDescription(`${oldMessage.author} edited a message`)
        .setAuthor({ name: `${newMessage.author}`, iconURL: avatarOf(newMessage.author) || undefined })
        .addFields(
            { name: 'Before', value: before.slice(0, 1024) || 'No Content', inline: false },
            { name: 'After', value: after.slice(0, 1024) || 'No Content', inline: false },
            { name: 'Channel', value: `<#${newMessage.channel.id}> (\`${newMessage.channel.id}\`)`, inline: false }
        )
        .setFooter({ text: `ID: ${newMessage.id}` })
        .setTimestamp();
    sendLog(oldMessage.guild, embed);
}

function logMemberJoin(member) {
    const young = Date.now() - member.user.createdTimestamp < 7 * 86400000;
    const embed = new EmbedBuilder()
        .setColor(young ? COLORS.WARNING : COLORS.SUCCESS)
        .setTitle('Member Join')
        .setDescription(`<@${member.id}> joined the server${young ? `\n${EMOJIS.WARNING} Account is younger than **7 days**` : ''}`)
        .setAuthor({ name: `${member}`, iconURL: avatarOf(member.user) || undefined })
        .addFields(
            { name: 'Created', value: `${stamp(member.user.createdTimestamp)}\n${stampRelative(member.user.createdTimestamp)}`, inline: false },
            { name: 'Joined', value: `${stamp(member.joinedTimestamp || Date.now())}\n${stampRelative(member.joinedTimestamp || Date.now())}`, inline: false }
        )
        .setFooter({ text: `Members: ${member.guild.memberCount} | ID: ${member.id}` })
        .setTimestamp(member.joinedTimestamp || Date.now());
    sendLog(member.guild, embed);
}

function logMemberRemove(member) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('Member Left')
        .setDescription(`<@${member.id}> left the server`)
        .setAuthor({ name: `${member}`, iconURL: avatarOf(member.user) || undefined })
        .addFields(
            { name: 'Created', value: `${stamp(member.user.createdTimestamp)}\n${stampRelative(member.user.createdTimestamp)}`, inline: false },
            { name: 'Joined', value: `${stamp(member.joinedTimestamp || member.user.createdTimestamp)}\n${stampRelative(member.joinedTimestamp || member.user.createdTimestamp)}`, inline: false }
        )
        .setFooter({ text: `Members: ${member.guild.memberCount} | ID: ${member.id}` })
        .setTimestamp();
    sendLog(member.guild, embed);
}

function logRoleCreate(role) {
    if (!role.guild) return;
    const embed = new EmbedBuilder()
        .setColor(COLORS.NEUTRAL)
        .setTitle('Role Create')
        .addFields({ name: 'Role', value: `**${role.name}** (\`${role.id}\`)`, inline: false })
        .setFooter({ text: `ID: ${role.id}` })
        .setTimestamp();
    auditActor(role.guild, 30).then(actor => {
        if (actor) embed.addFields({ name: 'Created by', value: `**${actor}** (\`${actor.id}\`)`, inline: false });
        sendLog(role.guild, embed);
    });
}

function logRoleDelete(role) {
    if (!role.guild) return;
    const embed = new EmbedBuilder()
        .setColor(COLORS.NEUTRAL)
        .setTitle('Role Delete')
        .addFields({ name: 'Role', value: `**${role.name}** (\`${role.id}\`)`, inline: false })
        .setFooter({ text: `ID: ${role.id}` })
        .setTimestamp();
    auditActor(role.guild, 32).then(actor => {
        if (actor) embed.addFields({ name: 'Deleted by', value: `**${actor}** (\`${actor.id}\`)`, inline: false });
        sendLog(role.guild, embed);
    });
}

function logRoleUpdate(oldRole, newRole) {
    if (!oldRole.guild) return;
    const embed = new EmbedBuilder()
        .setColor(COLORS.NEUTRAL)
        .setTitle('Role Update')
        .setFooter({ text: `ID: ${newRole.id}` })
        .setTimestamp();

    if (oldRole.name !== newRole.name) {
        embed.setDescription(`<@&${newRole.id}>'s name got updated`)
            .addFields(
                { name: 'Before', value: oldRole.name, inline: true },
                { name: 'After', value: newRole.name, inline: true }
            );
    } else if (oldRole.hoist !== newRole.hoist) {
        embed.setDescription(`<@&${newRole.id}> ${newRole.hoist ? 'is **hoisted**' : 'is **not** hoisted anymore'}`);
    } else if (oldRole.mentionable !== newRole.mentionable) {
        embed.setDescription(`<@&${newRole.id}> ${newRole.mentionable ? 'is **mentionable**' : 'is **not** mentionable anymore'}`);
    } else if (oldRole.color !== newRole.color) {
        embed.setDescription(`<@&${newRole.id}>'s color got updated`)
            .addFields(
                { name: 'Before', value: oldRole.hexColor, inline: true },
                { name: 'After', value: newRole.hexColor, inline: true }
            );
    } else {
        return;
    }

    auditActor(newRole.guild, 31).then(actor => {
        if (actor) embed.addFields({ name: 'Moderator', value: `**${actor}** (\`${actor.id}\`)`, inline: false });
        sendLog(newRole.guild, embed);
    });
}

function logVoiceStateUpdate(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    const beforeId = oldState.channel ? oldState.channel.id : null;
    const afterId = newState.channel ? newState.channel.id : null;

    if (beforeId !== afterId) {
        const embed = new EmbedBuilder()
            .setColor(COLORS.NEUTRAL)
            .setAuthor({ name: `${member}`, iconURL: avatarOf(member.user) || undefined })
            .setTimestamp();

        if (!oldState.channel && newState.channel) {
            embed.setTitle('Voice Channel Join')
                .setDescription(`<@${member.id}> joined voice channel`)
                .addFields({ name: 'Channel', value: `<#${newState.channel.id}>`, inline: false })
                .setFooter({ text: `ID: ${newState.channel.id}` });
        } else if (oldState.channel && !newState.channel) {
            embed.setTitle('Voice Channel Leave')
                .setDescription(`<@${member.id}> left voice channel`)
                .addFields({ name: 'Channel', value: `<#${oldState.channel.id}>`, inline: false })
                .setFooter({ text: `ID: ${oldState.channel.id}` });
        } else {
            embed.setTitle('Voice Channel Switch')
                .setDescription(`<@${member.id}> switched voice channel`)
                .addFields(
                    { name: 'Before', value: `<#${oldState.channel.id}>`, inline: true },
                    { name: 'After', value: `<#${newState.channel.id}>`, inline: true }
                )
                .setFooter({ text: `ID: ${newState.channel.id}` });
        }

        sendLog(newState.guild, embed);
        return;
    }

    const changes = [];
    if (oldState.mute !== newState.mute) changes.push(`Mute: ${newState.mute ? 'ON' : 'OFF'}`);
    if (oldState.deaf !== newState.deaf) changes.push(`Deaf: ${newState.deaf ? 'ON' : 'OFF'}`);
    if (!changes.length) return;

    const embed = new EmbedBuilder()
        .setColor(COLORS.NEUTRAL)
        .setTitle('Voice Update')
        .setDescription(`<@${member.id}>`)
        .setAuthor({ name: `${member}`, iconURL: avatarOf(member.user) || undefined })
        .addFields({ name: 'Changes', value: changes.join('\n'), inline: false })
        .setFooter({ text: `ID: ${newState.channel ? newState.channel.id : member.id}` })
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
