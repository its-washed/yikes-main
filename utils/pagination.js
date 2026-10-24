const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PRESERVE, flattenEmbed } = require('./embeds');

class Paginator {
    constructor(pages, opts = {}) {
        this.pages = pages;
        this.currentPage = 0;
        this.timeout = opts.timeout || 120000;
        this.userId = opts.userId;
        this.embedColor = opts.color || 0x6c5ce7;
    }

    async start(channel, initialMsg) {
        const firstRow = this.pages.length > 1 ? this.buildRow() : null;
        const msg = initialMsg || await channel.send({
            embeds: this.buildEmbeds(),
            components: firstRow ? [firstRow] : []
        });

        const collector = msg.createMessageComponentCollector({
            filter: (i) => !this.userId || i.user.id === this.userId,
            time: this.timeout
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'prev') this.currentPage = Math.max(0, this.currentPage - 1);
            else if (i.customId === 'next') this.currentPage = Math.min(this.pages.length - 1, this.currentPage + 1);
            else if (i.customId === 'first') this.currentPage = 0;
            else if (i.customId === 'last') this.currentPage = this.pages.length - 1;

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

        const extra = page.footer?.text ? `${page.footer.text}` : '';
        const text = extra ? `${footerText} | ${extra}` : footerText;

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

    buildRow() {
        if (this.pages.length <= 1) return new ActionRowBuilder();
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('first').setLabel('<<').setStyle(ButtonStyle.Secondary).setDisabled(this.currentPage === 0),
            new ButtonBuilder().setCustomId('prev').setLabel('<').setStyle(ButtonStyle.Primary).setDisabled(this.currentPage === 0),
            new ButtonBuilder().setCustomId('page').setLabel(`${this.currentPage + 1}/${this.pages.length}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('next').setLabel('>').setStyle(ButtonStyle.Primary).setDisabled(this.currentPage === this.pages.length - 1),
            new ButtonBuilder().setCustomId('last').setLabel('>>').setStyle(ButtonStyle.Secondary).setDisabled(this.currentPage === this.pages.length - 1)
        );
    }
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

module.exports = { Paginator, paginateArray, replyPaginated };
