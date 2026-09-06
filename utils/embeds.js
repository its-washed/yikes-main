const { EmbedBuilder } = require('discord.js');

const COLORS = {
    primary: 0x6c5ce7,
    success: 0x00d26a,
    error: 0xff4757,
    warning: 0xffa502,
    info: 0x74b9ff,
    neutral: 0x2f3542
};

function createEmbed(options = {}) {
    const embed = new EmbedBuilder();

    if (options.color) embed.setColor(options.color);
    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.author) embed.setAuthor(options.author);
    if (options.footer) embed.setFooter(options.footer);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);
    if (options.fields) embed.addFields(options.fields);
    if (options.timestamp !== false) embed.setTimestamp();

    return embed;
}

function successEmbed(title, description) {
    return createEmbed({
        color: COLORS.success,
        title: title || 'Success',
        description: description || ''
    });
}

function errorEmbed(title, description) {
    return createEmbed({
        color: COLORS.error,
        title: title || 'Error',
        description: description || ''
    });
}

function warningEmbed(title, description) {
    return createEmbed({
        color: COLORS.warning,
        title: title || 'Warning',
        description: description || ''
    });
}

function infoEmbed(title, description) {
    return createEmbed({
        color: COLORS.info,
        title: title || 'Info',
        description: description || ''
    });
}

function modLogEmbed(action, moderator, target, reason, color) {
    return createEmbed({
        color: color || COLORS.warning,
        title: `Moderation: ${action}`,
        fields: [
            { name: 'Moderator', value: `${moderator.tag} (${moderator.id})`, inline: true },
            { name: 'Target', value: `${target.tag} (${target.id})`, inline: true },
            { name: 'Reason', value: reason || 'No reason provided', inline: false }
        ]
    });
}

module.exports = {
    COLORS,
    createEmbed,
    successEmbed,
    errorEmbed,
    warningEmbed,
    infoEmbed,
    modLogEmbed
};
