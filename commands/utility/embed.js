const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { parseEmbed, parseColor } = require('../../utils/variables');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { Paginator } = require('../../utils/pagination');
const { getGuildConfig, updateGuildConfig } = require('../../utils/config');
const { hasPermission } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'embed',
        description: 'Create, send, or manage custom embeds',
        usage: ',embed <send|build|edit|list|delete|template> [args]'
    },
    aliases: ['e'],
    cooldown: 5,

    async execute(message, args, client, config) {
        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `send`, `build`, `edit`, `list`, `delete`, `template`')] });

        if (sub === 'send') return this.handleSend(message, args.slice(1), config);
        if (sub === 'build') return this.handleBuild(message, args.slice(1));
        if (sub === 'edit') return this.handleEdit(message, args.slice(1));
        if (sub === 'list') return this.handleList(message, config);
        if (sub === 'delete') return this.handleDelete(message, args.slice(1), config);
        if (sub === 'template') return this.handleTemplate(message, args.slice(1));

        return message.reply({ embeds: [errorEmbed('Invalid Subcommand', 'Valid: `send`, `build`, `edit`, `list`, `delete`, `template`')] });
    },

    async handleSend(message, args, config) {
        const channel = message.mentions.channels.first() || message.channel;
        const code = args.join(' ').replace(/<#\d+>/g, '').trim();
        if (!code) return message.reply({ embeds: [errorEmbed('No Embed Code', 'Provide embed code. Example: `,embed send #channel {title: Hello}$v{description: Welcome}'`')] });

        const ctx = { member: message.member, user: message.author, guild: message.guild, message };
        const parsed = parseEmbed(code, ctx);
        if (!parsed) return message.reply({ embeds: [errorEmbed('Parse Error', 'Could not parse embed code.')] });

        const embed = new EmbedBuilder();
        if (parsed.color) embed.setColor(parsed.color);
        if (parsed.title) embed.setTitle(parsed.title);
        if (parsed.description) embed.setDescription(parsed.description);
        if (parsed.url) embed.setURL(parsed.url);
        if (parsed.image) embed.setImage(parsed.image.url);
        if (parsed.thumbnail) embed.setThumbnail(parsed.thumbnail.url);
        if (parsed.author) embed.setAuthor(parsed.author);
        if (parsed.footer) embed.setFooter(parsed.footer);
        if (parsed.timestamp) embed.setTimestamp();
        if (parsed.fields) embed.addFields(parsed.fields);

        const components = [];
        if (parsed.buttons && parsed.buttons.length > 0) {
            const row = new ActionRowBuilder();
            for (const btn of parsed.buttons.slice(0, 5)) {
                const style = { blue: ButtonStyle.Primary, green: ButtonStyle.Success, grey: ButtonStyle.Secondary, red: ButtonStyle.Danger }[btn.style] || ButtonStyle.Primary;
                const b = new ButtonBuilder().setLabel(btn.label).setStyle(style);
                if (btn.emoji) b.setEmoji(btn.emoji);
                if (btn.url) b.setURL(btn.url);
                row.addComponents(b);
            }
            components.push(row);
        }

        await channel.send({ embeds: [embed], components }).catch(() => {});
        const reply = await message.reply({ embeds: [successEmbed('Embed Sent', `Sent to ${channel}`)] });
        setTimeout(() => reply.delete().catch(() => {}), 3000);
    },

    async handleBuild(message, args) {
        const code = args.join(' ').trim();
        if (!code) return message.reply({ embeds: [errorEmbed('No Code', 'Provide embed code to preview.')] });

        const ctx = { member: message.member, user: message.author, guild: message.guild, message };
        const parsed = parseEmbed(code, ctx);
        if (!parsed) return message.reply({ embeds: [errorEmbed('Parse Error', 'Could not parse embed code.')] });

        const embed = new EmbedBuilder();
        if (parsed.color) embed.setColor(parsed.color);
        if (parsed.title) embed.setTitle(parsed.title);
        if (parsed.description) embed.setDescription(parsed.description);
        if (parsed.image) embed.setImage(parsed.image.url);
        if (parsed.thumbnail) embed.setThumbnail(parsed.thumbnail.url);
        if (parsed.fields) embed.addFields(parsed.fields);

        const components = [];
        if (parsed.buttons && parsed.buttons.length > 0) {
            const row = new ActionRowBuilder();
            for (const btn of parsed.buttons.slice(0, 5)) {
                const style = { blue: ButtonStyle.Primary, green: ButtonStyle.Success, grey: ButtonStyle.Secondary, red: ButtonStyle.Danger }[btn.style] || ButtonStyle.Primary;
                const b = new ButtonBuilder().setLabel(btn.label).setStyle(style);
                if (btn.emoji) b.setEmoji(btn.emoji);
                if (btn.url) b.setURL(btn.url);
                row.addComponents(b);
            }
            components.push(row);
        }

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('embed_confirm').setLabel('Send Here').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('embed_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const msg = await message.reply({ embeds: [embed], components: [...components, confirmRow] });
        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 30000,
            max: 1
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'embed_confirm') {
                await message.channel.send({ embeds: [embed], components });
                await i.update({ content: 'Embed sent!', embeds: [], components: [] });
            } else {
                await i.update({ content: 'Cancelled.', embeds: [], components: [] });
            }
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) msg.edit({ components: [] }).catch(() => {});
        });
    },

    async handleEdit(message, args) {
        const msgId = args[0];
        const code = args.slice(1).join(' ').trim();
        if (!msgId || !code) return message.reply({ embeds: [errorEmbed('Usage', ',embed edit <messageId> <embed code>')] });

        try {
            const targetMsg = await message.channel.messages.fetch(msgId);
            const ctx = { member: message.member, user: message.author, guild: message.guild, message };
            const parsed = parseEmbed(code, ctx);
            if (!parsed) return message.reply({ embeds: [errorEmbed('Parse Error', 'Could not parse embed code.')] });

            const embed = new EmbedBuilder();
            if (parsed.color) embed.setColor(parsed.color);
            if (parsed.title) embed.setTitle(parsed.title);
            if (parsed.description) embed.setDescription(parsed.description);
            if (parsed.image) embed.setImage(parsed.image.url);
            if (parsed.thumbnail) embed.setThumbnail(parsed.thumbnail.url);
            if (parsed.fields) embed.addFields(parsed.fields);

            await targetMsg.edit({ embeds: [embed] });
            return message.reply({ embeds: [successEmbed('Edited', 'Message updated.')] });
        } catch {
            return message.reply({ embeds: [errorEmbed('Not Found', 'Could not fetch that message.')] });
        }
    },

    async handleList(message, config) {
        const saved = config.savedEmbeds || [];
        if (saved.length === 0) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Saved Embeds', description: 'No saved embeds.\nUse `,embed send` with a name prefix to save.' })] });
        }

        const pages = [];
        for (let i = 0; i < saved.length; i += 5) {
            const chunk = saved.slice(i, i + 5);
            pages.push({
                color: 0x6c5ce7,
                title: `Saved Embeds (${saved.length})`,
                description: chunk.map((e, j) => `**${i + j + 1}.** ${e.name || 'Unnamed'}`).join('\n')
            });
        }

        const paginator = new Paginator(pages, { userId: message.author.id });
        return paginator.start(message.channel);
    },

    async handleDelete(message, args, config) {
        const name = args.join(' ').trim();
        if (!name) return message.reply({ embeds: [errorEmbed('No Name', 'Provide the embed name to delete.')] });

        const saved = config.savedEmbeds || [];
        const idx = saved.findIndex(e => e.name?.toLowerCase() === name.toLowerCase());
        if (idx === -1) return message.reply({ embeds: [errorEmbed('Not Found', 'No saved embed with that name.')] });

        saved.splice(idx, 1);
        updateGuildConfig(message.guild.id, { savedEmbeds: saved });
        return message.reply({ embeds: [successEmbed('Deleted', `Removed \`${name}\`.`)] });
    },

    async handleTemplate(message, args) {
        const templates = {
            welcome: '{color: #00d26a}$v{title: Welcome to {guild.name}!}$v{description: Hey {user.mention}, glad to have you here!}$v{thumbnail: {user.avatar}}',
            goodbye: '{color: #ff4757}$v{title: Goodbye!}$v{description: {user.display} has left {guild.name}.$v{footer: We will miss you!}',
            rules: '{color: #ffa502}$v{title: Server Rules}$v{description: 1. Be respectful\n2. No spam\n3. No NSFW\n4. Follow Discord TOS}$v{footer: By staying you agree to the rules}',
            announcement: '{color: #74b9ff}$v{title: Announcement}$v{description: {description}}$v{footer: Posted by {user.display}}',
            ban: '{color: #ff4757}$v{title: You have been banned}$v{description: **Reason:** {reason}\n**Server:** {guild.name}}',
            mute: '{color: #ffa502}$v{title: You have been muted}$v{description: **Reason:** {reason}\n**Duration:** {duration}}',
            ticket: '{color: #6c5ce7}$v{title: Support Ticket}$v{description: {user.mention} has opened a ticket.\n**Topic:** {topic}}',
        };

        const name = args[0]?.toLowerCase();
        if (!name || !templates[name]) {
            const list = Object.keys(templates).map(t => `\`${t}\``).join(', ');
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Templates', description: `Available: ${list}\nUsage: `,embed template <name>\`` })] });
        }

        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Template: ${name}`, description: `\`\`\`${templates[name]}\`\`\`` })] });
    }
};
