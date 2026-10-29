const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { warn } = require('../../utils/context');
const { run, first } = require('../../utils/database');
const { ensureEconomy } = require('../../utils/predicates');
const E = require('../../utils/econ');

module.exports = {
    data: { name: 'bonus', description: 'Claim your bonus cash', usage: ',bonus' },
    aliases: [],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        const row = E.ensureAccount(message.author.id);
        const now = Date.now() / 1000;
        if (row.bonus && row.bonus > now) {
            return warn(message, `Your bonus is on cooldown\n> Available <t:${Math.floor(row.bonus)}:R>`);
        }

        const config = first('SELECT bonus_min, bonus_max FROM economy_config WHERE active = 1')
            || { bonus_min: 50, bonus_max: 200 };
        const amounts = [
            Math.floor(config.bonus_min + Math.random() * (config.bonus_max - config.bonus_min)),
            Math.floor(config.bonus_min + Math.random() * (config.bonus_max - config.bonus_min)),
            Math.floor(config.bonus_min + Math.random() * (config.bonus_max - config.bonus_min))
        ];
        for (let i = amounts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [amounts[i], amounts[j]] = [amounts[j], amounts[i]];
        }

        run('UPDATE economy SET bonus = ? WHERE user_id = ?', Math.floor(now + 15 * 60), message.author.id);

        const rowButtons = new ActionRowBuilder().addComponents(
            amounts.map((amount, index) => new ButtonBuilder()
                .setCustomId(`bonus_${index}`)
                .setLabel('???')
                .setStyle(ButtonStyle.Primary))
        );

        const sent = await message.reply({
            embeds: [createEmbed({ color: COLORS.NEUTRAL, description: 'Click a button to reveal your prize!' })],
            components: [rowButtons]
        });

        const collector = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
        let revealed = false;
        collector.on('collect', async i => {
            if (revealed) return i.reply({ content: `${EMOJIS.WARNING} ${i.user}: The prize has already been revealed.`, ephemeral: true }).catch(() => {});
            revealed = true;
            collector.stop();
            const index = Number(i.customId.split('_')[1]) || 0;
            const prize = amounts[index];
            run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', prize, i.user.id);
            E.addCollectMoney(i.user.id, 'bonus', prize);
            E.logging(i.user.id, prize, 'collected', 'bonus');
            const buttons = new ActionRowBuilder().addComponents(
                amounts.map((amount, idx) => new ButtonBuilder()
                    .setCustomId(`bonus_${idx}`)
                    .setLabel(amount.toLocaleString('en-US'))
                    .setStyle(idx === index ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(true))
            );
            await i.update({
                embeds: [createEmbed({
                    color: COLORS.SUCCESS,
                    description: `${EMOJIS.APPROVE} ${i.user}: Congratulations! You won **${amounts[index].toLocaleString('en-US')}** 💵`
                })],
                components: [buttons]
            });
        });
        collector.on('end', () => {
            sent.edit({ components: [] }).catch(() => {});
        });
    }
};
