const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { parseEmbed, parseColor } = require('../../utils/variables');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { Paginator } = require('../../utils/pagination');
const { getGuildConfig, updateGuildConfig } = require('../../utils/config');
const { hasPermission } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'embed',
        description: "Create embeds using the bot",
        usage: ',embed <send|build|edit|list|delete|template> [args]'
    },
    aliases: [],
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
        if (!code) return message.reply({ embeds: [errorEmbed('No Embed Code', 'Provide embed code. Example: `,embed send #channel {title: Hello}$v{description: Welcome}`')] });

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
            return message.reply({ embeds: [createEmbed({ color: 0x729bb0, title: 'Saved Embeds', description: 'No saved embeds.\nUse `,embed send` with a name prefix to save.' })] });
        }

        const pages = [];
        for (let i = 0; i < saved.length; i += 5) {
            const chunk = saved.slice(i, i + 5);
            pages.push({
                color: 0x729bb0,
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
            return message.reply({ embeds: [createEmbed({ color: 0x729bb0, title: 'Templates', description: `Available: ${list}\nUsage: \`,embed template <name>\`` })] });
        }

        return message.reply({ embeds: [createEmbed({ color: 0x729bb0, title: `Template: ${name}`, description: `\`\`\`${templates[name]}\`\`\`` })] });
    }
};

const { run, first, query: dbQuery } = require('../../utils/database');

function resolveMessage(message, token) {
    if (!token) return null;
    const raw = String(token).trim();
    const link = raw.match(/discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
    if (link) {
        const channel = message.client.channels.cache.get(link[2]);
        if (!channel || !channel.messages) return null;
        return channel.messages.fetch(link[3]).catch(() => null);
    }
    const id = raw.replace(/[<#>]/g, '');
    if (!/^\d{17,20}$/.test(id)) return null;
    return message.channel.messages.fetch(id).catch(() => null);
}

async function parseCode(message, code) {
    if (code) {
        const ctx = { member: message.member, user: message.author, guild: message.guild, message };
        return parseEmbed(code, ctx);
    }
    const attachment = message.attachments.first();
    if (!attachment || !attachment.name.toLowerCase().endsWith('.json')) return null;
    try {
        const { embedReplacement } = require('../../utils/embedScript');
        const res = await fetch(attachment.url);
        const data = await res.json();
        const msg = data.backups[0].messages[0];
        const content = msg.data.content ? embedReplacement(message.author, msg.data.content) : null;
        const embeds = [];
        for (const embed of (msg.data.embeds || [])) {
            const replaced = embedReplacement(message.author, JSON.stringify(embed));
            embeds.push(JSON.parse(replaced));
            if (embeds.length === 10) break;
        }
        return { content, embeds };
    } catch (err) {
        throw new Error("Couldn't decode JSON, are you sure this is a valid JSON file?");
    }
}

function fieldNamesValid(field) {
    const allowed = ['content', 'description', 'footer_text', 'footer_image', 'image', 'thumbnail', 'title', 'url', 'color', 'author_icon', 'author_name', 'author_url'];
    return allowed.includes(field) || /^field_\d+_(title|text|inline)$/.test(field);
}

module.exports.subs = {
    create: {
        aliases: [],
        data: { name: 'embed create', description: "Create an embed using an embed code\n> **Embed Builder:** https://evelina.bot/embed", usage: ',embed create {embed}$v{description: Hello world}' },
        execute: async (message, args) => {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
            try {
                const code = await parseCode(message, args.join(' ').trim());
                if (!code) return message.reply({ embeds: [errorEmbed('No Embed Code', 'Provide embed code or attach a discohook JSON file.\n> **Embed Builder:** https://evelina.bot/embed')] });
                const payload = {};
                if (code.content) payload.content = code.content;
                if (code.embeds) payload.embeds = Array.isArray(code.embeds) ? code.embeds : [code.embeds];
                return await message.reply(payload);
            } catch (err) {
                return message.reply({ embeds: [errorEmbed('Error', `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``)] });
            }
        }
    },
    overwrite: {
        aliases: [],
        data: { name: 'embed overwrite', description: 'Overwrite an embed sent by evelina', usage: ',embed overwrite <message link> {embed}$v{description: Hello world}' },
        execute: async (message, args) => {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
            const target = await resolveMessage(message, args[0]);
            if (!target) return message.reply({ embeds: [errorEmbed('Usage', ',embed overwrite <message link> <embed code>')] });
            if (target.author.id !== message.client.user.id) {
                return message.reply({ embeds: [errorEmbed('Invalid', `This is not a message sent by **${message.client.user.username}**`)] });
            }
            try {
                const code = await parseCode(message, args.slice(1).join(' ').trim());
                if (!code) return message.reply({ embeds: [errorEmbed('No Embed Code', 'Provide embed code or attach a discohook JSON file.')] });
                const payload = {};
                if (code.content) payload.content = code.content;
                if (code.embeds) payload.embeds = Array.isArray(code.embeds) ? code.embeds : [code.embeds];
                await target.edit(payload);
                return message.reply({ embeds: [successEmbed('Success', `Overwrite message -> ${target.jumpUrl}`)] });
            } catch (err) {
                return message.reply({ embeds: [errorEmbed('Error', `An error occurred:\n\`\`\`${err.message}\`\`\``)] });
            }
        }
    },
    edit: {
        aliases: [],
        data: { name: 'embed edit', description: 'Edit an embed sent by evelina', usage: ',embed edit <message link> description Hello world' },
        execute: async (message, args) => {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

            if (/^\d{17,20}$/.test(String(args[0] || '')) && !fieldNamesValid(String(args[1] || ''))) {
                return module.exports.handleEdit(message, args);
            }
            const target = await resolveMessage(message, args[0]);
            if (!target) return message.reply({ embeds: [errorEmbed('Usage', ',embed edit <message link> <field> <value>')] });
            if (target.author.id !== message.client.user.id) {
                return message.reply({ embeds: [errorEmbed('Invalid', `This is not a message sent by **${message.client.user.username}**`)] });
            }
            const field = String(args[1] || '').toLowerCase();
            const value = args.slice(2).join(' ');
            if (!fieldNamesValid(field)) {
                return message.reply({ embeds: [errorEmbed('Invalid Field', 'Invalid field. Use: `content`, `description`, `footer_text`, `footer_image`, `image`, `thumbnail`, `title`, `url`, `color`, `author_icon`, `author_name`, `author_url`, `field_1_title`, `field_1_text` or `field_1_inline`')] });
            }
            const data = target.embeds && target.embeds[0] ? { ...target.embeds[0].data } : {};
            if (field === 'content') {
                await target.edit({ content: value });
            } else if (field === 'description') {
                data.description = value;
            } else if (field === 'footer_text') {
                data.footer = { ...(data.footer || {}), text: value };
            } else if (field === 'footer_image') {
                data.footer = { ...(data.footer || { text: '\u200b' }), icon_url: value };
            } else if (field === 'image') {
                data.image = { url: value };
            } else if (field === 'thumbnail') {
                data.thumbnail = { url: value };
            } else if (field === 'title') {
                data.title = value;
            } else if (field === 'url') {
                data.url = value;
            } else if (field === 'color') {
                try { data.color = parseInt(String(value).replace('#', ''), 16); }
                catch (err) { data.color = parseInt('808080', 16); }
            } else if (field === 'author_icon') {
                data.author = { ...(data.author || { name: '\u200b' }), icon_url: value };
            } else if (field === 'author_name') {
                data.author = { ...(data.author || {}), name: value };
            } else if (field === 'author_url') {
                data.author = { ...(data.author || { name: '\u200b' }), url: value };
            } else if (field.startsWith('field_')) {
                const match = field.match(/^field_(\d+)_(title|text|inline)$/);
                if (!match) return message.reply({ embeds: [errorEmbed('Invalid Field', 'Invalid field format. Use: field_X_title or field_X_text')] });
                const num = Number(match[1]);
                data.fields = data.fields || [];
                while (data.fields.length < num) data.fields.push({ name: '\u200b', value: '\u200b', inline: false });
                if (match[2] === 'title') data.fields[num - 1].name = value;
                else if (match[2] === 'text') data.fields[num - 1].value = value;
                else data.fields[num - 1].inline = true;
            }
            if (field !== 'content') await target.edit({ embeds: [data] });
            return message.reply({ embeds: [successEmbed('Success', `Edited message -> ${target.jumpUrl}`)] });
        }
    },
    copy: {
        aliases: [],
        data: { name: 'embed copy', description: 'Copy the embed code of each embed in the message as separate messages', usage: ',embed copy <message link>' },
        execute: async (message, args) => {
            const target = await resolveMessage(message, args[0]);
            if (!target) return message.reply({ embeds: [errorEmbed('Usage', ',embed copy <message link>')] });
            if (!target.embeds.length) return message.reply({ embeds: [errorEmbed('No Embeds', 'That message has no embeds.')] });
            for (const embed of target.embeds.slice(0, 10)) {
                const code = JSON.stringify(embed.data, null, 2);
                if (code.length > 1900) {
                    await message.reply({ files: [{ attachment: Buffer.from(code), name: 'embed_code.json' }] }).catch(() => {});
                } else {
                    await message.reply({ content: `\`\`\`${code}\`\`\`` }).catch(() => {});
                }
            }
        }
    },
    save: {
        aliases: [],
        data: { name: 'embed save', description: 'Save the embed code of a certain embed', usage: ',embed save <message link>' },
        execute: async (message, args) => {
            const target = await resolveMessage(message, args[0]);
            if (!target) return message.reply({ embeds: [errorEmbed('Usage', ',embed save <message link>')] });
            if (!target.embeds.length) return message.reply({ embeds: [errorEmbed('No Embeds', 'That message has no embeds.')] });
            const source = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 8; i++) code += source[Math.floor(Math.random() * source.length)];
            const embedCode = JSON.stringify(target.embeds[0].data, null, 2);
            run('INSERT INTO embeds (code, embed, user_id) VALUES (?, ?, ?)', code, embedCode, message.author.id);
            return message.reply({ embeds: [successEmbed('Success', `Saved the embed code as \`${code}\``)] });
        }
    },
    load: {
        aliases: [],
        data: { name: 'embed load', description: 'Load a saved embed code', usage: ',embed load bZYdgLvu' },
        execute: async (message, args) => {
            const code = String(args[0] || '').trim();
            if (!code) return message.reply({ embeds: [errorEmbed('Usage', ',embed load <code>')] });
            const result = first('SELECT * FROM embeds WHERE code = ?', code);
            if (!result) return message.reply({ embeds: [errorEmbed('Not Found', `Embedcode \`${code}\` does not exist`)] });
            if (result.embed.length > 1900) {
                return message.reply({ files: [{ attachment: Buffer.from(result.embed), name: 'embed_code.txt' }] });
            }
            return message.reply({ content: `\`\`\`${result.embed}\`\`\`` });
        }
    },
    post: {
        aliases: [],
        data: { name: 'embed post', description: "Post an embed on evelina's web", usage: ',embed post Boost <embed code>' },
        execute: async (message, args) => {
            const check = first('SELECT 1 AS ok FROM embeds_creator WHERE user_id = ?', message.author.id);
            if (!check) return message.reply({ embeds: [errorEmbed('Invalid', 'You are not permited to post embeds')] });
            const names = ['Welcome', 'Leave', 'Boost', 'Vanity', 'Autoresponder', 'Last.fm', 'Ban', 'Unabn', 'Kick', 'Mute', 'Unmute', 'Jail', 'Unjail'];
            const name = args[0];
            if (!names.includes(name)) {
                const formatted = names.slice(0, -1).map((entry) => `\`${entry}\``).join(', ') + ` & \`${names[names.length - 1]}\``;
                return message.reply({ embeds: [errorEmbed('Invalid Name', `Invalid name. Valid names are: ${formatted}`)] });
            }
            const code = args.slice(1).join(' ').trim();
            const attachment = message.attachments.first();
            if (!attachment) return message.reply({ embeds: [errorEmbed('Missing Image', 'You have to attach an image as embed preview')] });
            const fileCode = require('crypto').randomBytes(4).toString('hex');
            run('INSERT INTO embeds_templates (name, user_id, code, embed, image) VALUES (?, ?, ?, ?, ?)',
                name, message.author.id, fileCode, code, attachment.url);
            return message.reply({ embeds: [successEmbed('Success', `Posted your embed (\`#${fileCode}\`) to [\`evelina.bot/templates\`](https://evelina.bot/templates)`)] });
        }
    }
};
