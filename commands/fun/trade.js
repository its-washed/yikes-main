const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/cards.json');

function loadData() {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
    data: {
        name: 'trade',
        description: 'Trade a card with another user',
        usage: ',trade [@user] [card_id]'
    },
    aliases: [],
    cooldown: 15,

    async execute(message, args) {
        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,trade [@user] [card_id]')] });

        if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('Invalid Trade', 'You cannot trade with yourself.')] });

        const cardId = args[1];
        if (!cardId) return message.reply({ embeds: [errorEmbed('Missing Card ID', 'Usage: ,trade [@user] [card_id]')] });

        const data = loadData();
        const guildId = message.guild.id;

        if (!data[guildId] || !data[guildId].cards) {
            return message.reply({ embeds: [errorEmbed('No Cards', 'You have no cards to trade.')] });
        }

        const card = data[guildId].cards.find(c => c.id === cardId && c.claimedBy === message.author.id);
        if (!card) return message.reply({ embeds: [errorEmbed('Card Not Found', 'You don\'t own a card with that ID.')] });

        const msg = await message.reply({
            embeds: [createEmbed({
                color: 0xffa502,
                title: 'Trade Offer',
                description: `${message.author.tag} wants to trade **${card.character}** (${card.emoji} ${card.rarity}) to ${target.user.tag}.\n\n${target.user.tag}, react with ✅ to accept or ❌ to decline.`
            })]
        });

        await msg.react('✅');
        await msg.react('❌');

        const filter = (r, u) => u.id === target.id && ['✅', '❌'].includes(r.emoji.name);
        const collector = msg.createReactionCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async (reaction) => {
            if (reaction.emoji.name === '❌') {
                await msg.edit({ embeds: [createEmbed({ color: 0xff4757, title: 'Trade Declined', description: `${target.user.tag} declined the trade.` })] });
                await msg.reactions.removeAll();
                return;
            }

            card.claimedBy = target.id;
            card.claimedAt = Date.now();
            saveData(data);

            await msg.edit({ embeds: [successEmbed('Trade Complete', `${message.author.tag} traded **${card.character}** to ${target.user.tag}!`)] });
            await msg.reactions.removeAll();
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                msg.edit({ embeds: [createEmbed({ color: 0xffa502, title: 'Trade Expired', description: 'No response in time.' })] });
                msg.reactions.removeAll();
            }
        });
    }
};
