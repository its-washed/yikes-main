const { Events } = require('discord.js');
const { takePrompt } = require('../utils/modal');

module.exports = {
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction) {
        if (!interaction.isModalSubmit()) return;
        if (interaction.customId.startsWith('ticket_')) {
            return require('../utils/tickets').handleModal(interaction).catch(() => false);
        }
        if (interaction.customId === 'confess_modal' || interaction.customId === 'confess_reply_modal') {
            const confessions = require('../utils/confessions');
            const content = interaction.fields.getTextInputValue('content');
            const attachment = interaction.fields.getTextInputValue('attachment') || '';
            if (interaction.customId === 'confess_modal') return confessions.submitConfession(interaction, content, attachment);
            return confessions.submitReply(interaction, content, attachment);
        }
        if (interaction.customId === 'suggestion_create') {
            const suggestion = require('../utils/suggestion');
            return suggestion.handleCreateSubmit(interaction);
        }
        if (interaction.customId.startsWith('apply_')) {
            return require('../commands/server/apply').handleSubmit(interaction);
        }
        if (interaction.customId.startsWith('coc_verify_')) {
            return require('../commands/utility/clashofclans').handleVerify(interaction);
        }
        if (interaction.customId === 'vm_rename') {
            return require('../utils/voiceMasterButtons').handleVmRenameModal(interaction);
        }
        if (interaction.customId === 'appeal_submit') {
            return require('../utils/appeals').handleSubmit(interaction);
        }
        if (interaction.customId.startsWith('appeal_mod:')) {
            return require('../utils/appeals').handleModerationSubmit(interaction, interaction.customId.split(':')[1]);
        }
        if (interaction.customId.startsWith('pgoto_')) {
            return require('../utils/pagination').handleGotoSubmit(interaction);
        }
        const opts = takePrompt(interaction.customId);
        if (!opts || typeof opts.onSubmit !== 'function') {
            return interaction.reply({ content: 'This form has expired.', ephemeral: true }).catch(() => {});
        }
        try {
            const values = [];
            for (let i = 0; i < (opts.fields || []).length; i++) {
                values.push(interaction.fields.getTextInputValue(`field_${i}`));
            }
            await opts.onSubmit(interaction, values);
        } catch (err) {
            interaction.reply({ content: 'Something went wrong processing the form.', ephemeral: true }).catch(() => {});
        }
    }
};
