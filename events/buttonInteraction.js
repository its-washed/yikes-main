const { Events } = require('discord.js');
const { logger } = require('../utils/logger');
const { first } = require('../utils/database');
const { getPrompt, buildModal } = require('../utils/modal');
const { altConvert, scriptPayload } = require('../utils/embedScript');

async function handleButtonMessage(interaction, buttonId) {
    const row = first('SELECT embed FROM button_message WHERE guild_id = ? AND message_id = ? AND button_id = ?',
        interaction.guild.id, interaction.message.id, buttonId);
    if (!row) return false;
    const replyError = async (err) => {
        const content = `Failed to send the embed response\n\`\`\`${err.message}\`\`\``;
        try {
            if (interaction.replied || interaction.deferred) await interaction.followup.send({ content, ephemeral: true });
            else await interaction.reply({ content, ephemeral: true });
        } catch (err2) {}
    };
    try {
        const payload = scriptPayload(altConvert(interaction.member, row.embed));
        if (!payload.content && !payload.embeds) return true;
        if (interaction.replied || interaction.deferred) await interaction.followup.send({ ...payload, ephemeral: true });
        else await interaction.reply({ ...payload, ephemeral: true });
    } catch (err) {
        await replyError(err);
    }
    return true;
}

module.exports = {
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction) {
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        if (interaction.isButton()) {
            const appeals = require('../utils/appeals');
            if (appeals.isAppealButton(interaction.customId)) {

                return appeals.handleAppealButton(interaction).catch(err => logger.error(`appeal button: ${err.message}`));
            }
        }

        if (!interaction.guild) return;

        if (interaction.customId.startsWith('snapcode_')) {
            const snapchat = require('../commands/server/snapchat');
            const snapcode = snapchat.snapData && snapchat.snapData.get(interaction.customId.replace('snapcode_', ''));
            if (!snapcode) return interaction.reply({ content: 'This button has expired.', ephemeral: true }).catch(() => {});
            return interaction.reply({ embeds: [{ color: 0xFFFF00, image: { url: snapcode } }], ephemeral: true }).catch(() => {});
        }

        if (interaction.customId.startsWith('persistent:')) {
            const suggestion = require('../utils/suggestion');
            if (interaction.customId === 'persistent:upvote_suggestion') return suggestion.handleVote(interaction, 'upvote');
            if (interaction.customId === 'persistent:downvote_suggestion') return suggestion.handleVote(interaction, 'downvote');
            if (interaction.customId === 'persistent:create_suggestion') return suggestion.openCreateModal(interaction);
            const confessions = require('../utils/confessions');
            if (interaction.customId === 'persistent:submit_confession') {
                return interaction.showModal(confessions.buildModal('confess_modal', 'Submit a Confession')).catch(() => {});
            }
            if (interaction.customId === 'persistent:reply_confession' || interaction.customId === 'persistent:submit_reply') {
                return interaction.showModal(confessions.buildReplyModal()).catch(() => {});
            }
            if (interaction.customId === 'persistent:pagination_previous' || interaction.customId === 'persistent:pagination_next') {
                const { handlePageChange } = require('../utils/pagination');
                return handlePageChange(interaction, interaction.customId.endsWith('previous') ? -1 : 1);
            }
        }

        if (interaction.customId.startsWith('persistent:app_')) {
            return require('../commands/server/apply').handleModeration(interaction);
        }
        if (interaction.customId.startsWith('persistent:giveaway_enter')) {
            return require('../commands/server/giveaway').handleEnter(interaction);
        }
        if (interaction.customId.startsWith('modal_')) {
            const opts = getPrompt(interaction.customId);
            if (!opts) return interaction.reply({ content: 'This form has expired.', ephemeral: true }).catch(() => {});
            const modal = buildModal(interaction.customId, opts);
            return interaction.showModal(modal).catch(() => {
                interaction.reply({ content: 'Could not open the form.', ephemeral: true }).catch(() => {});
            });
        }

        if (interaction.customId.startsWith('checkout_select_')) {
            const method = interaction.customId.replace('checkout_select_', '');
            const checkout = first('SELECT amount FROM checkout WHERE message = ?', interaction.message.id);
            if (!checkout) return interaction.reply({ content: 'Checkout message is **not** valid', ephemeral: true });
            const receiver = first('SELECT receiver FROM payment_methods WHERE method = ? AND guild_id = ?', method, interaction.guild.id);
            if (!receiver) return interaction.reply({ content: `Receiver for ${method} not found`, ephemeral: true });
            let target = receiver.receiver;
            if (method === 'paysafecard' || method === 'amazon') {
                target = `Click on the button below to pay with ${method}`;
            }
            return interaction.reply({ content: `**${method}** - \`${checkout.amount}\`\n**Receiver:** ${target}`, ephemeral: true });
        }

        if (interaction.customId.startsWith('bm_')) {
            const handled = await handleButtonMessage(interaction, interaction.customId.replace('bm_', ''));
            if (handled) return;
        }

        if (interaction.customId.startsWith('crypto_copy:')) {
            return interaction.reply({ content: interaction.customId.replace('crypto_copy:', ''), ephemeral: true });
        }

        const buttonRole = first('SELECT role_id FROM button_role WHERE guild_id = ? AND message_id = ? AND button_id = ?', 
            interaction.guild.id, interaction.message.id, interaction.customId);
        if (buttonRole) {
            const { toggleButtonRole } = require('../commands/server/buttonrole');
            return toggleButtonRole(interaction, buttonRole.role_id);
        }

        if (interaction.customId.startsWith('vm_')) {
            const { handleVmInteraction } = require('../utils/voiceMasterButtons');
            return handleVmInteraction(interaction);
        }

        await handleButtonMessage(interaction, interaction.customId);
    }
};
