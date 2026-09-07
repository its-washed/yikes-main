const { EmbedBuilder } = require('discord.js');

const COLORS = {
    primary: 0x6c5ce7,
    success: 0x00d26a,
    error: 0xff4757,
    warning: 0xffa502,
    info: 0x74b9ff,
    neutral: 0x2f3542
};

function createEmbed(opts = {}) {
    const embed = new EmbedBuilder();

    if (opts.color) embed.setColor(opts.color);
    if (opts.title) embed.setTitle(opts.title);
    if (opts.description) embed.setDescription(opts.description);
    if (opts.author) embed.setAuthor(opts.author);
    if (opts.footer) embed.setFooter(opts.footer);
    if (opts.thumbnail) embed.setThumbnail(opts.thumbnail);
    if (opts.image) embed.setImage(opts.image);
    if (opts.fields) embed.addFields(opts.fields);
    if (opts.timestamp !== false) embed.setTimestamp();

    return embed;
}

function successEmbed(title, desc) {
    return createEmbed({ color: COLORS.success, title: title || 'Success', description: desc || '' });
}

function errorEmbed(title, desc) {
    return createEmbed({ color: COLORS.error, title: title || 'Error', description: desc || '' });
}

function warningEmbed(title, desc) {
    return createEmbed({ color: COLORS.warning, title: title || 'Warning', description: desc || '' });
}

function infoEmbed(title, desc) {
    return createEmbed({ color: COLORS.info, title: title || 'Info', description: desc || '' });
}

function modLogEmbed(action, mod, target, reason, color) {
    return createEmbed({
        color: color || COLORS.warning,
        title: `Mod: ${action}`,
        fields: [
            { name: 'Moderator', value: `${mod.tag} (${mod.id})`, inline: true },
            { name: 'Target', value: `${target.tag} (${target.id})`, inline: true },
            { name: 'Reason', value: reason || 'No reason', inline: false }
        ]
    });
}

module.exports = { COLORS, createEmbed, successEmbed, errorEmbed, warningEmbed, infoEmbed, modLogEmbed };
