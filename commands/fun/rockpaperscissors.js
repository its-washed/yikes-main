const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { warn } = require('../../utils/context');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');
const { record } = require('../../utils/gameStats');

const EMOJI = { rock: '🪨', paper: '📰', scissors: '✂️' };
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

function choiceRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rps_rock').setEmoji(EMOJI.rock).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rps_paper').setEmoji(EMOJI.paper).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rps_scissors').setEmoji(EMOJI.scissors).setStyle(ButtonStyle.Secondary)
    );
}

function winnerOf(a, b) {
    if (a === b) return null;
    return BEATS[a] === b ? 'p1' : 'p2';
}

module.exports = {
    data: { name: 'rockpaperscissors', description: 'Play rock-paper-scissors with a member or the bot', usage: ',rockpaperscissors its_washed', params: ['[opponent]'] },
    aliases: ['rps'],
    cooldown: 5,

    async execute(message, args, client) {
        let opponent = null;
        if (args[0]) {
            const id = String(args[0]).replace(/[<@!>]/g, '');
            opponent = /^\d{17,20}$/.test(id) ? message.guild.members.cache.get(id) : null;
            opponent = opponent || message.mentions.members.first() || null;
            if (!opponent) return warn(message, 'Member not found\n> Usage: `rockpaperscissors its_washed`');
            if (opponent.user.bot) return warn(message, "You can't play against a bot");
            if (opponent.id === message.author.id) return warn(message, "You can't play against yourself");
        }

        const embed = opponent
            ? createEmbed({
                color: COLORS.NEUTRAL,
                title: 'Rock Paper Scissors!',
                description: `${message.author} has challenged ${opponent} to a game! Both players, click a button to make your choice!`
            })
            : createEmbed({
                color: COLORS.NEUTRAL,
                title: 'Rock Paper Scissors!',
                description: 'You challenged the bot to a game! Click a button to make your choice!'
            });

        const sent = await message.reply({ embeds: [embed], components: [choiceRow()] });

        const players = opponent ? [message.author.id, opponent.id] : [message.author.id];
        const choices = {};

        const collector = sent.createMessageComponentCollector({
            filter: i => players.includes(i.user.id),
            time: 60000,
            max: opponent ? 2 : 1
        });

        collector.on('collect', async i => {
            const selection = i.customId.replace('rps_', '');
            choices[i.user.id] = selection;

            if (opponent && Object.keys(choices).length < 2) {
                await i.update({ content: `${i.user}: your choice is **locked in** — waiting for the other player.`, components: [choiceRow()] }).catch(() => {});
                return;
            }

            let resultMessage;
            if (opponent) {
                const first = choices[players[0]];
                const second = choices[players[1]];
                const outcome = winnerOf(first, second);
                if (outcome === null) {
                    resultMessage = `It's a tie! Both players chose ${EMOJI[first]}`;
                    record(null, null, 'tie', 'rockpaperscissors');
                } else {
                    const winner = outcome === 'p1' ? players[0] : players[1];
                    const loser = outcome === 'p1' ? players[1] : players[0];
                    resultMessage = `<@${players[0]}>: ${EMOJI[first]} vs <@${players[1]}>: ${EMOJI[second]}\n> <@${winner}> wins!`;
                    record(winner, loser, 'win', 'rockpaperscissors');
                }
            } else {
                const botSelection = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
                const outcome = winnerOf(selection, botSelection);
                if (outcome === null) {
                    resultMessage = `It's a tie! Both players chose ${EMOJI[selection]}`;
                    record(message.author.id, null, 'tie', 'rockpaperscissors');
                } else if (outcome === 'p1') {
                    resultMessage = `You win! You chose ${EMOJI[selection]} and the bot chose ${EMOJI[botSelection]}.`;
                    record(message.author.id, null, 'win', 'rockpaperscissors');
                } else {
                    resultMessage = `The bot wins! You chose ${EMOJI[selection]}, the bot chose ${EMOJI[botSelection]}.`;
                    record(null, message.author.id, 'win', 'rockpaperscissors');
                }
            }

            await i.update({
                embeds: [createEmbed({ color: COLORS.NEUTRAL, title: 'Match result', description: resultMessage })],
                components: []
            }).catch(() => {});
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                sent.edit({ embeds: [errorEmbed('Game Expired', 'No one made a choice in time.')], components: [] }).catch(() => {});
            } else {
                sent.edit({ components: [] }).catch(() => {});
            }
        });

        return sent;
    }
};
