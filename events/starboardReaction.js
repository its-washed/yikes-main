const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/config');

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

        const config = getGuildConfig(message.guild.id);
        const sb = config.starboard;
        if (!sb?.enabled || !sb.channel) return;
        if (message.author.bot) return;

        const emoji = sb.emoji || '⭐';
        const isCustomEmoji = reaction.emoji.id !== null;
        const matchesEmoji = isCustomEmoji
            ? reaction.emoji.id === emoji || reaction.emoji.name === emoji
            : reaction.emoji.name === emoji;

        if (!matchesEmoji) return;

        const starCount = reaction.count;
        if (starCount < (sb.threshold || 5)) return;

        const starChannel = message.guild.channels.cache.get(sb.channel);
        if (!starChannel) return;

        const existing = await starChannel.messages.fetch({ limit: 100 });
        const starMsg = existing.find(m =>
            m.embeds.length > 0 &&
            m.embeds[0].footer?.text?.includes(message.id)
        );

        if (starMsg) {
            const embed = EmbedBuilder.from(starMsg.embeds[0]);
            embed.setFooter({ text: `${emoji} ${starCount} | ${message.id}` });
            await starMsg.edit({ embeds: [embed] }).catch(() => {});
        } else {
            const attachment = message.attachments.first();
            const embed = new EmbedBuilder()
                .setColor(0xffd700)
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription(message.content || '*No text*')
                .setFooter({ text: `${emoji} ${starCount} | ${message.id}` })
                .setTimestamp();

            if (attachment) embed.setImage({ url: attachment.url });

            await starChannel.send({ content: `Original: ${message.url}`, embeds: [embed] }).catch(() => {});
        }
    }
};
