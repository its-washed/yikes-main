const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const { createEmbed, PRESERVE } = require('../../utils/embeds');

const PER_PAGE = 6;

const n = value => Number(value).toLocaleString('en-US');

function shardInfo(client) {
    let members = 0;
    for (const guild of client.guilds.cache.values()) members += guild.memberCount || 0;
    return {
        id: client.shard ? client.shard.ids[0] : 0,
        ping: client.ws.ping,
        guilds: client.guilds.cache.size,
        members
    };
}

async function getShards(client) {
    if (client.shard) {
        try {
            const parts = await client.shard.broadcastEval(shardInfo);
            return parts.filter(Boolean).sort((a, b) => a.id - b.id);
        } catch {}
    }
    return [shardInfo(client)];
}

function orderShards(shards, sorted) {
    if (!sorted) return shards;
    return [...shards].sort((a, b) => b.ping - a.ping);
}

function buildEmbed(shards, totals, myShard, page, sorted) {
    const start = page * PER_PAGE;
    const slice = orderShards(shards, sorted).slice(start, start + PER_PAGE);
    const fields = slice.map(s => ({
        name: `Shard ${s.id}${s.id === myShard ? ' ◄ You' : ''}`,
        value: `**ping:** ${s.ping}ms\n**guilds:** ${n(s.guilds)}\n**users:** ${n(s.members)}`,
        inline: true
    }));

    return createEmbed({
        color: 0x6c5ce7,
        timestamp: false,
        title: `Total shards (${shards.length})`,
        description: `**Total Users: ${n(totals.members)}**\n**Total Guilds: ${n(totals.guilds)}**`,
        fields
    });
}

function buildRow(sorted) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shards_prev').setLabel('<').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('shards_next').setLabel('>').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('shards_sort').setLabel('⇅').setStyle(sorted ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('shards_close').setLabel('✕').setStyle(ButtonStyle.Danger)
    );
}

module.exports = {
    data: { name: 'shards', description: 'Shard info', usage: ',shards' },
    cooldown: 5,
    async execute(message, args, client) {
        const shards = await getShards(client);
        const totals = shards.reduce(
            (sum, s) => ({ members: sum.members + s.members, guilds: sum.guilds + s.guilds }),
            { members: 0, guilds: 0 }
        );
        const myShard = client.shard ? client.shard.ids[0] : 0;
        const pages = Math.max(1, Math.ceil(shards.length / PER_PAGE));
        let page = 0;
        let sorted = false;

        const payload = () => ({
            embeds: [buildEmbed(shards, totals, myShard, page, sorted)],
            components: [buildRow(sorted)],
            [PRESERVE]: true
        });

        const sent = await message.reply(payload());
        if (!sent || typeof sent.createMessageComponentCollector !== 'function') return sent;

        const collector = sent.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: `Only ${message.author} can use these controls.`, flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            if (i.customId === 'shards_close') {
                await i.update({ components: [] }).catch(() => {});
                collector.stop('closed');
                await i.message.delete().catch(() => {});
                return;
            }
            if (i.customId === 'shards_prev') page = (page - 1 + pages) % pages;
            else if (i.customId === 'shards_next') page = (page + 1) % pages;
            else if (i.customId === 'shards_sort') sorted = !sorted;
            await i.update(payload()).catch(() => {});
        });

        collector.on('end', () => {
            sent.edit({ components: [] }).catch(() => {});
        });

        return sent;
    }
};
