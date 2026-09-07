const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class Paginator {
    constructor(pages, opts = {}) {
        this.pages = pages;
        this.currentPage = 0;
        this.timeout = opts.timeout || 120000;
        this.userId = opts.userId;
        this.embedColor = opts.color || 0x6c5ce7;
    }

    async start(channel, initialMsg) {
        const msg = initialMsg || await channel.send({
            embeds: [this.buildEmbed()],
            components: [this.buildRow()]
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
                embeds: [this.buildEmbed()],
                components: [this.buildRow()]
            });
        });

        collector.on('end', () => {
            msg.edit({ components: [] }).catch(() => {});
        });

        return msg;
    }

    buildEmbed() {
        const page = this.pages[this.currentPage];
        if (typeof page === 'string') {
            return {
                color: this.embedColor,
                description: page,
                footer: { text: `Page ${this.currentPage + 1} / ${this.pages.length}` }
            };
        }
        return {
            ...page,
            footer: { ...(page.footer || {}), text: `${page.footer?.text ? page.footer.text + ' | ' : ''}Page ${this.currentPage + 1} / ${this.pages.length}` }
        };
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

module.exports = { Paginator, paginateArray };
