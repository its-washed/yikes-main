const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { first, run } = require('../utils/database');

function matchesEmoji(reaction, emoji) {
    if (!emoji) return false;
    if (reaction.emoji.id) {
        return reaction.emoji.id === emoji || reaction.emoji.name === emoji || reaction.emoji.toString() === emoji;
    }
    return reaction.emoji.name === emoji;
}

module.exports = {
    name: Events.MessageReactionAdd,
    once: false,

    async execute(reaction, user) {
        if (user.bot) return;

        if (reaction.partial) {
            try { await reaction.fetch(); } catch { return; }
        }
        if (reaction.message.partial) {
            try { await reaction.message.fetch(); } catch { return; }
        }

        const message = reaction.message;
        if (!message.guild) return;

        const moduleRow = first('SELECT clownboard FROM modules WHERE guild_id = ?', message.guild.id);
        if (!moduleRow || !(moduleRow.clownboard === 1 || moduleRow.clownboard === true)) return;

        if (first('SELECT 1 AS ok FROM clownboard_ignored WHERE guild_id = ? AND channel_id = ?', message.guild.id, message.channel.id)) return;

        const config = first('SELECT * FROM clownboard WHERE guild_id = ?', message.guild.id);
        if (!config || !config.emoji) return;
        if (!matchesEmoji(reaction, config.emoji)) return;

        const needed = Number(config.count) || 1;
        if (reaction.count < needed) return;

        const target = message.guild.channels.cache.get(String(config.channel_id));
        if (!target || target.id === message.channel.id) return;

        const me = message.guild.members.me;
        if (target.permissionsFor && me && !target.permissionsFor(me).sendMessages) return;

        const existing = first('SELECT clownboard_message_id FROM clownboard_messages WHERE guild_id = ? AND channel_id = ? AND message_id = ?',
            message.guild.id, message.channel.id, message.id);
        const header = `${config.emoji} **#${reaction.count}** <#${message.channel.id}>`;

        if (existing) {
            const posted = await target.messages.fetch(String(existing.clownboard_message_id)).catch(() => null);
            if (posted) {
                await posted.edit({ content: header }).catch(() => {});
            } else {
                run('DELETE FROM clownboard_messages WHERE guild_id = ? AND channel_id = ? AND message_id = ?',
                    message.guild.id, message.channel.id, message.id);
            }
            return;
        }

        let embed;
        if (message.embeds.length) {
            embed = EmbedBuilder.from(message.embeds[0]);
            if (!embed.data.description) embed.setDescription(message.content || '*No text*');
            if (!embed.data.author) embed.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });
        } else {
            embed = new EmbedBuilder()
                .setColor(0x729bb0)
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription(message.content || '*No text*')
                .setTimestamp(message.createdAt);

            const attachment = message.attachments.first();
            if (attachment && /\.(png|jpe?g|gif|webp)$/i.test(attachment.name || attachment.url)) {
                embed.setImage(attachment.url);
            }
        }

        if (message.reference) {
            const resolved = message.reference.resolved;
            if (resolved && resolved.author && resolved.jumpUrl) {
                embed.setDescription(`${embed.data.description || ''}\n\u21a9\ufe0f [Replying to ${resolved.author}](${resolved.jumpUrl})`);
            } else if (resolved === null || resolved === undefined || resolved.deleted) {
                embed.setDescription(`${embed.data.description || ''}\n\u21a9\ufe0f Replying to a deleted message`);
            }
        }

        const components = [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('message').setStyle(ButtonStyle.Link).setURL(message.url)
        )];

        const posted = await target.send({ content: header, embeds: [embed], components }).catch(() => null);
        if (!posted) return;

        run('INSERT OR IGNORE INTO clownboard_messages (guild_id, channel_id, message_id, clownboard_message_id) VALUES (?, ?, ?, ?)',
            message.guild.id, message.channel.id, message.id, posted.id);
    }
};
