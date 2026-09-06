const { createEmbed } = require('../../utils/embeds');
module.exports = { data: { name: 'eat', description: 'Eat food', usage: ',eat [food]' }, aliases: ['food'], cooldown: 3, async execute(message, args) { const food = args.join(' ') || 'something'; return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Nom!', description: `${message.author} eats **${food}**! 🍕` })] }); } };
