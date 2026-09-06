const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/config');

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
            embed.setFooter({ text: `⭐ ${starCount} | ${message.id}` });
            await starMsg.edit({ embeds: [embed] }).catch(() => {});
        } else {
            const attachment = message.attachments.first();
            const embed = new EmbedBuilder()
                .setColor(0xffd700)
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription(message.content || '*No text*')
                .setFooter({ text: `⭐ ${starCount} | ${message.id}` })
                .setTimestamp();

            if (attachment) embed.setImage({ url: attachment.url });

            const row = { content: `Original: ${message.url}` };
            await starChannel.send({ content: row.content, embeds: [embed] }).catch(() => {});
        }
    }
};
