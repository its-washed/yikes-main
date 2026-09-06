const { createEmbed } = require('../../utils/embeds');

const urbanData = [
    { word: 'yeet', definition: 'To throw with great force', example: 'Yeet that trash can!' },
    { word: 'cap', definition: 'A lie or falsehood', example: 'That\'s cap, no way that happened.' },
    { word: 'slay', definition: 'To do something exceptionally well', example: 'She slayed that presentation.' },
    { word: 'sus', definition: 'Suspicious or suspect', example: 'That\'s kinda sus ngl.' },
    { word: 'vibe', definition: 'A feeling or atmosphere', example: 'This place has great vibes.' },
    { word: 'stan', definition: 'An obsessive fan', example: 'She\'s a total stan for that artist.' },
    { word: 'flex', definition: 'To show off', example: 'Stop flexing your money.' },
    { word: 'simp', definition: 'Someone who does too much for a person they like', example: 'Don\'t be a simp.' },
    { word: 'bussin', definition: 'Really good (usually food)', example: 'This pizza is bussin!' },
    { word: 'rizz', definition: 'Charisma or charm', example: 'He\'s got serious rizz.' }
];

module.exports = {
    data: {
        name: 'urban',
        description: 'Look up a word in Urban Dictionary',
        usage: ',urban [word]'
    },
    aliases: ['ud', 'slang'],
    cooldown: 5,

    async execute(message, args) {
        const word = args[0]?.toLowerCase();

        if (!word) {
            const random = urbanData[Math.floor(Math.random() * urbanData.length)];
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: `Urban Dictionary — Random`,
                    fields: [
                        { name: 'Word', value: `**${random.word}**`, inline: true },
                        { name: 'Definition', value: random.definition, inline: false },
                        { name: 'Example', value: `*"${random.example}"*`, inline: false }
                    ]
                })]
            });
        }

        const found = urbanData.find(d => d.word === word) || urbanData[Math.floor(Math.random() * urbanData.length)];

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Urban Dictionary — ${found.word}`,
                fields: [
                    { name: 'Definition', value: found.definition, inline: false },
                    { name: 'Example', value: `*"${found.example}"*`, inline: false }
                ]
            })]
        });
    }
};
