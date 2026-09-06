const { createEmbed, errorEmbed } = require('../../utils/embeds');
const fs = require('fs');
const path = require('path');
const { isPremium } = require('../../utils/premium');

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

function getRarity() {
    const roll = Math.random() * 100;
    if (roll < 1) return { name: 'Mythic', color: 0xffd700, emoji: '🌟' };
    if (roll < 4) return { name: 'Legendary', color: 0xff6b6b, emoji: '🔥' };
    if (roll < 12) return { name: 'Epic', color: 0xa855f7, emoji: '💜' };
    if (roll < 28) return { name: 'Rare', color: 0x3b82f6, emoji: '💙' };
    if (roll < 55) return { name: 'Uncommon', color: 0x22c55e, emoji: '💚' };
    return { name: 'Common', color: 0x9ca3af, emoji: '⚪' };
}

const CHARACTERS = [
    { name: 'Naruto Uzumaki', series: 'Naruto', tier: 'S' },
    { name: 'Goku', series: 'Dragon Ball', tier: 'S' },
    { name: 'Luffy', series: 'One Piece', tier: 'S' },
    { name: 'Gojo Satoru', series: 'Jujutsu Kaisen', tier: 'S' },
    { name: 'Levi Ackerman', series: 'Attack on Titan', tier: 'S' },
    { name: 'Eren Yeager', series: 'Attack on Titan', tier: 'A' },
    { name: 'Tanjiro Kamado', series: 'Demon Slayer', tier: 'A' },
    { name: 'Edward Elric', series: 'FMA', tier: 'A' },
    { name: 'Saitama', series: 'One Punch Man', tier: 'A' },
    { name: 'Deku', series: 'My Hero Academia', tier: 'A' },
    { name: 'Killua', series: 'Hunter x Hunter', tier: 'A' },
    { name: 'Gon Freecss', series: 'Hunter x Hunter', tier: 'B' },
    { name: 'Zoro', series: 'One Piece', tier: 'B' },
    { name: 'Sasuke', series: 'Naruto', tier: 'B' },
    { name: 'Sakura', series: 'Naruto', tier: 'B' },
    { name: 'Giyu Tomioka', series: 'Demon Slayer', tier: 'B' },
    { name: 'Zenitsu', series: 'Demon Slayer', tier: 'B' },
    { name: 'Inosuke', series: 'Demon Slayer', tier: 'B' },
    { name: 'Bakugo', series: 'My Hero Academia', tier: 'B' },
    { name: 'Todoroki', series: 'My Hero Academia', tier: 'B' },
    { name: 'Vegeta', series: 'Dragon Ball', tier: 'B' },
    { name: 'Piccolo', series: 'Dragon Ball', tier: 'C' },
    { name: 'Krillin', series: 'Dragon Ball', tier: 'C' },
    { name: 'Sanji', series: 'One Piece', tier: 'C' },
    { name: 'Nami', series: 'One Piece', tier: 'C' },
    { name: 'Robin', series: 'One Piece', tier: 'C' },
    { name: 'Shikamaru', series: 'Naruto', tier: 'C' },
    { name: 'Hinata', series: 'Naruto', tier: 'C' },
    { name: 'Jiraiya', series: 'Naruto', tier: 'C' },
    { name: 'Itachi', series: 'Naruto', tier: 'A' },
    { name: 'Madara', series: 'Naruto', tier: 'S' },
    { name: 'Might Guy', series: 'Naruto', tier: 'A' },
    { name: 'Pain', series: 'Naruto', tier: 'A' },
    { name: 'Kakashi', series: 'Naruto', tier: 'A' },
    { name: 'Ichigo', series: 'Bleach', tier: 'A' },
    { name: 'Aizen', series: 'Bleach', tier: 'S' },
    { name: 'L', series: 'Death Note', tier: 'A' },
    { name: 'Light Yagami', series: 'Death Note', tier: 'A' },
    { name: 'Alucard', series: 'Hellsing', tier: 'A' },
    { name: 'Guts', series: 'Berserk', tier: 'S' },
    { name: 'Spike Spiegel', series: 'Cowboy Bebop', tier: 'B' },
    { name: 'Sailor Moon', series: 'Sailor Moon', tier: 'B' },
    { name: 'Gon', series: 'Hunter x Hunter', tier: 'B' },
    { name: 'Hisoka', series: 'Hunter x Hunter', tier: 'A' },
    { name: 'Meruem', series: 'Hunter x Hunter', tier: 'S' },
    { name: 'Makima', series: 'Chainsaw Man', tier: 'A' },
    { name: 'Denji', series: 'Chainsaw Man', tier: 'B' },
    { name: 'Power', series: 'Chainsaw Man', tier: 'B' },
    { name: 'Asta', series: 'Black Clover', tier: 'B' },
    { name: 'Yuno', series: 'Black Clover', tier: 'B' },
    { name: 'Meliodas', series: 'Seven Deadly Sins', tier: 'A' },
    { name: 'Ban', series: 'Seven Deadly Sins', tier: 'B' },
    { name: 'Escannor', series: 'Seven Deadly Sins', tier: 'S' },
    { name: 'Toriko', series: 'Toriko', tier: 'C' },
    { name: 'Gintoki', series: 'Gintama', tier: 'B' },
    { name: 'Kenshin', series: 'Rurouni Kenshin', tier: 'C' },
    { name: 'Inuyasha', series: 'Inuyasha', tier: 'B' },
    { name: 'Sesshomaru', series: 'Inuyasha', tier: 'A' },
    { name: 'Mikasa', series: 'Attack on Titan', tier: 'B' },
    { name: 'Armin', series: 'Attack on Titan', tier: 'C' },
    { name: 'Erwin', series: 'Attack on Titan', tier: 'A' },
    { name: 'Reiner', series: 'Attack on Titan', tier: 'B' },
    { name: 'Annie', series: 'Attack on Titan', tier: 'B' },
    { name: 'Zero Two', series: 'Darling in the Franxx', tier: 'B' },
    { name: 'Holo', series: 'Spice and Wolf', tier: 'C' },
    { name: 'Rem', series: 'Re:Zero', tier: 'A' },
    { name: 'Emilia', series: 'Re:Zero', tier: 'A' },
    { name: 'Subaru', series: 'Re:Zero', tier: 'B' },
    { name: 'Aldebaran', series: 'Re:Zero', tier: 'S' },
    { name: 'Ainz', series: 'Overlord', tier: 'S' },
    { name: 'Shalltear', series: 'Overlord', tier: 'A' },
    { name: 'Cocytus', series: 'Overlord', tier: 'B' },
    { name: 'Rimuru', series: 'Slime', tier: 'S' },
    { name: 'Shion', series: 'Slime', tier: 'B' },
    { name: 'Benimaru', series: 'Slime', tier: 'B' },
    { name: 'Kazuma', series: 'KonoSuba', tier: 'C' },
    { name: 'Aqua', series: 'KonoSuba', tier: 'B' },
    { name: 'Megumin', series: 'KonoSuba', tier: 'A' },
    { name: 'Darkness', series: 'KonoSuba', tier: 'C' },
    { name: 'Kirito', series: 'SAO', tier: 'B' },
    { name: 'Asuna', series: 'SAO', tier: 'A' },
    { name: 'Sinon', series: 'SAO', tier: 'B' },
    { name: 'Leafa', series: 'SAO', tier: 'C' },
    { name: 'Tifa', series: 'Final Fantasy', tier: 'A' },
    { name: 'Cloud', series: 'Final Fantasy', tier: 'A' },
    { name: 'Sephiroth', series: 'Final Fantasy', tier: 'S' },
    { name: 'Lightning', series: 'Final Fantasy', tier: 'B' },
    { name: '2B', series: 'NieR', tier: 'A' },
    { name: '9S', series: 'NieR', tier: 'B' },
    { name: 'Dante', series: 'Devil May Cry', tier: 'A' },
    { name: 'Vergil', series: 'Devil May Cry', tier: 'S' },
    { name: 'Ryu', series: 'Street Fighter', tier: 'B' },
    { name: 'Chun-Li', series: 'Street Fighter', tier: 'B' },
    { name: 'Mega Man', series: 'Mega Man', tier: 'C' },
    { name: 'Samus', series: 'Metroid', tier: 'B' },
    { name: 'Link', series: 'Zelda', tier: 'A' },
    { name: 'Zelda', series: 'Zelda', tier: 'B' },
    { name: 'Ganondorf', series: 'Zelda', tier: 'A' },
    { name: 'Mario', series: 'Mario', tier: 'B' },
    { name: 'Pikachu', series: 'Pokemon', tier: 'B' },
    { name: 'Charizard', series: 'Pokemon', tier: 'A' },
    { name: 'Mewtwo', series: 'Pokemon', tier: 'S' },
    { name: 'Lucario', series: 'Pokemon', tier: 'A' },
    { name: 'Gengar', series: 'Pokemon', tier: 'A' },
    { name: 'Dragonite', series: 'Pokemon', tier: 'A' },
    { name: 'Rayquaza', series: 'Pokemon', tier: 'S' },
    { name: 'Arceus', series: 'Pokemon', tier: 'S' }
];

        const CLAIM_COOLDOWN = 3 * 60 * 60 * 1000;

        module.exports = {
            data: {
                name: 'claim',
                description: 'Claim a random anime character card (3h cooldown, Premium = no cooldown)',
                usage: ',claim'
            },
            aliases: ['summon'],
            cooldown: 10,

            async execute(message) {
                const data = loadData();
                const guildId = message.guild.id;
                if (!data[guildId]) data[guildId] = {};
                if (!data[guildId].cards) data[guildId].cards = [];
                if (!data[guildId].cooldowns) data[guildId].cooldowns = {};

                const premium = isPremium(message.author.id);

                if (!premium) {
            const lastClaim = data[guildId].cooldowns[message.author.id] || 0;
            const now = Date.now();
            const elapsed = now - lastClaim;

            if (elapsed < CLAIM_COOLDOWN) {
                const remaining = CLAIM_COOLDOWN - elapsed;
                const hours = Math.floor(remaining / 3600000);
                const minutes = Math.floor((remaining % 3600000) / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);

                return message.reply({
                    embeds: [errorEmbed('Cooldown', `You must wait **${hours}h ${minutes}m ${seconds}s** before claiming again.\n\n*Premium users have no cooldown!*`)]
                });
            }
        }

        const char = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        const rarity = getRarity();

        const card = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            character: char.name,
            series: char.series,
            tier: char.tier,
            rarity: rarity.name,
            emoji: rarity.emoji,
            color: rarity.color,
            claimedBy: message.author.id,
            claimedAt: Date.now()
        };

        data[guildId].cards.push(card);
        data[guildId].cooldowns[message.author.id] = Date.now();
        saveData(data);

        return message.reply({
            embeds: [createEmbed({
                color: rarity.color,
                title: `${rarity.emoji} ${char.name}`,
                description: `**${char.series}**`,
                fields: [
                    { name: 'Rarity', value: `${rarity.emoji} ${rarity.name}`, inline: true },
                    { name: 'Tier', value: char.tier, inline: true },
                    { name: 'Card ID', value: `\`${card.id}\``, inline: true }
                ],
                footer: { text: `Claimed by ${message.author.tag}${premium ? ' (Premium)' : ''}` },
                timestamp: new Date().toISOString()
            })]
        });
    }
};

module.exports.CHARACTERS = CHARACTERS;
module.exports.getRarity = getRarity;
