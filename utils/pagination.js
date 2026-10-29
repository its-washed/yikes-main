const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { first, run, query } = require('./database');
const { COLORS, EMOJIS } = require('./styles');
const { altConvert, scriptPayload } = require('./embedScript');
const { PRESERVE, flattenEmbed } = require('./embeds');

class Paginator {
    constructor(pages, opts = {}) {
        this.pages = pages;
        this.currentPage = 0;
        this.timeout = opts.timeout || 120000;
        this.userId = opts.userId;
        this.embedColor = opts.color || 0x729bb0;
    }

    async start(channel, initialMsg) {
        const firstRow = this.pages.length > 1 ? this.buildRow() : null;
        const msg = initialMsg || await channel.send({
            embeds: this.buildEmbeds(),
            components: firstRow ? [firstRow] : []
        });

        const collector = msg.createMessageComponentCollector({
            filter: (i) => {
                if (!this.userId || i.user.id === this.userId) return true;
                i.reply({
                    embeds: [{
                        color: COLORS.WARNING,
                        description: `${EMOJIS.WARNING} ${i.user}: You are not the **author** of this embed`
                    }],
                    ephemeral: true
                }).catch(() => {});
                return false;
            },
            time: this.timeout
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'prev') {
                this.currentPage = this.currentPage === 0 ? this.pages.length - 1 : this.currentPage - 1;
            } else if (i.customId === 'next') {
                this.currentPage = this.currentPage === this.pages.length - 1 ? 0 : this.currentPage + 1;
            } else if (i.customId === 'goto') {
                return this.promptGoto(i);
            } else if (i.customId === 'delete') {
                collector.stop();
                return i.message.delete().catch(() => {});
            }

            await i.update({
                embeds: this.buildEmbeds(),
                components: this.pages.length > 1 ? [this.buildRow()] : []
            });
        });

        collector.on('end', () => {
            msg.edit({ components: [] }).catch(() => {});
        });

        return msg;
    }

    buildEmbeds() {
        const page = this.pages[this.currentPage];
        const total = this.pages.length;
        const footerText = `Page: ${this.currentPage + 1}/${total}`;

        if (typeof page === 'string') {
            return [{
                color: this.embedColor,
                description: page,
                footer: { text: footerText }
            }];
        }

        const lastEmbed = Array.isArray(page.embeds) && page.embeds.length
            ? page.embeds[page.embeds.length - 1]
            : null;
        const ownFooter = (page.footer && page.footer.text)
            ? page.footer
            : (lastEmbed && lastEmbed.footer) || null;
        const extra = ownFooter && ownFooter.text ? `${ownFooter.text}` : '';
        const entriesMatch = /^\((\d+)\s+entries?\)$/.exec(extra);
        const text = entriesMatch
            ? `${footerText} (${entriesMatch[1]} entries)`
            : extra
                ? (extra.startsWith('(') ? `${footerText} ${extra}` : `${footerText} ・ ${extra}`)
                : footerText;

        const keep = Boolean(page[PRESERVE]);

        if (Array.isArray(page.embeds)) {
            const embeds = page.embeds.map(e => (typeof e.toJSON === 'function' ? { ...e.toJSON() } : { ...e }));
            embeds[embeds.length - 1].footer = { ...(embeds[embeds.length - 1].footer || {}), text };
            return keep ? embeds : embeds.map(flattenEmbed);
        }

        const built = [{
            ...page,
            footer: { ...(page.footer || {}), text }
        }];
        return keep ? built : built.map(flattenEmbed);
    }

    async promptGoto(interaction) {
        const id = `pgoto_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const modal = new ModalBuilder()
            .setCustomId(id)
            .setTitle('Go to')
            .addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('page')
                    .setLabel('page')
                    .setPlaceholder('page number')
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            ));
        gotoPrompts.set(id, this);
        await interaction.showModal(modal).catch(() => gotoPrompts.delete(id));
    }

    buildRow() {
        if (this.pages.length <= 1) return new ActionRowBuilder();
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev').setEmoji('◀️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('next').setEmoji('▶️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('goto').setEmoji('↕️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('delete').setEmoji('✖️').setStyle(ButtonStyle.Danger)
        );
    }
}

const gotoPrompts = new Map();

async function handleGotoSubmit(interaction) {
    const paginator = gotoPrompts.get(interaction.customId);
    if (!paginator) {
        return interaction.reply({ content: 'This form has expired.', ephemeral: true }).catch(() => {});
    }
    gotoPrompts.delete(interaction.customId);

    const raw = String(interaction.fields.getTextInputValue('page') || '').trim();
    const num = Number(raw);
    if (!raw || Number.isNaN(num)) {
        return interaction.reply({
            embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${interaction.user}: This is not a number` }],
            ephemeral: true
        }).catch(() => {});
    }
    if (!Number.isInteger(num) || num < 1 || num > paginator.pages.length) {
        return interaction.reply({
            embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${interaction.user}: Invalid Page` }],
            ephemeral: true
        }).catch(() => {});
    }

    paginator.currentPage = num - 1;
    return interaction.update({
        embeds: paginator.buildEmbeds(),
        components: paginator.pages.length > 1 ? [paginator.buildRow()] : []
    }).catch(() => {});
}

function paginateArray(arr, perPage) {
    const pages = [];
    for (let i = 0; i < arr.length; i += perPage) {
        pages.push(arr.slice(i, i + perPage));
    }
    return pages;
}

async function replyPaginated(message, pages, opts = {}) {
    const paginator = new Paginator(pages, { userId: message.author.id, ...opts });
    const embeds = paginator.buildEmbeds();
    const components = pages.length > 1 ? [paginator.buildRow()] : [];
    const payload = { embeds, components };
    if (opts.preserve) payload[PRESERVE] = true;
    const sent = await message.reply(payload);
    if (pages.length > 1) await paginator.start(message.channel, sent);
    return sent;
}

const lastInteraction = new Map();

function paginationRows() {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('persistent:pagination_previous').setEmoji('◀️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('persistent:pagination_next').setEmoji('▶️').setStyle(ButtonStyle.Primary)
    )];
}

function currentPage(messageId) {
    const record = first('SELECT current_page FROM paginate_data WHERE message_id = ?', messageId);
    return record ? record.current_page : 0;
}

function setCurrentPage(messageId, page) {
    run('INSERT INTO paginate_data (message_id, current_page) VALUES (?, ?) ON CONFLICT (message_id) DO UPDATE SET current_page = ?',
        messageId, page, page);
}

function fetchPageScript(guildId, channelId, messageId, page) {
    const row = first('SELECT embed FROM paginate_embeds WHERE guild_id = ? AND channel_id = ? AND message_id = ? AND page = ?',
        guildId, channelId, messageId, page);
    return row ? row.embed : null;
}

async function handlePageChange(interaction, change) {
    const userId = interaction.user.id;
    const now = Date.now() / 1000;
    const lastTime = lastInteraction.get(userId) || 0;
    if (now - lastTime < 2) {
        return interaction.reply({
            embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${interaction.user.mention}: You are too fast, please wait a little bit...` }],
            ephemeral: true
        }).catch(() => {});
    }
    lastInteraction.set(userId, now);
    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;
    const messageId = interaction.message.id;
    const countRow = first('SELECT COUNT(*) AS total FROM paginate_embeds WHERE guild_id = ? AND channel_id = ? AND message_id = ?',
        guildId, channelId, messageId);
    const totalPages = countRow ? countRow.total : 0;
    if (!totalPages) {
        return interaction.reply({ content: 'This paginated message has no pages.', ephemeral: true }).catch(() => {});
    }
    let nextPage = currentPage(messageId) + change;
    if (nextPage < 1) nextPage = totalPages;
    else if (nextPage > totalPages) nextPage = 1;
    const script = fetchPageScript(guildId, channelId, messageId, nextPage);
    setCurrentPage(messageId, nextPage);
    await interaction.deferUpdate().catch(() => {});
    if (script === null || script === undefined) return;
    let payload;
    try {
        payload = scriptPayload(altConvert(interaction.user, script));
    } catch {
        payload = { content: script };
    }
    payload.components = paginationRows();
    await interaction.message.edit(payload).catch(() => {});
}

module.exports = { Paginator, paginateArray, replyPaginated, paginationRows, currentPage, setCurrentPage, fetchPageScript, handlePageChange, handleGotoSubmit };
