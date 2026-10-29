const { ModalBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle } = require('discord.js');
const { createEmbed } = require('./embeds');

const prompts = new Map();

function makeId() {
    return 'modal_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function modalPrompt(message, opts) {
    const id = makeId();
    prompts.set(id, opts);
    return message.reply({
        embeds: [createEmbed({ color: 0x729bb0, description: opts.prompt })],
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(id).setLabel(opts.buttonLabel || 'Open').setStyle(ButtonStyle.Primary)
        )]
    });
}

function getPrompt(id) {
    return prompts.get(id) || null;
}

function takePrompt(id) {
    const opts = prompts.get(id) || null;
    prompts.delete(id);
    return opts;
}

function buildModal(id, opts) {
    const modal = new ModalBuilder().setCustomId(id).setTitle((opts.title || 'Form').slice(0, 45));
    (opts.fields || []).slice(0, 5).forEach((field, index) => {
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId(`field_${index}`)
                .setLabel(String(field.label || `Field ${index + 1}`).slice(0, 45))
                .setPlaceholder(field.placeholder ? String(field.placeholder).slice(0, 100) : ' ')
                .setRequired(field.required !== false)
                .setStyle(field.multiline ? TextInputStyle.Paragraph : TextInputStyle.Short)
        ));
    });
    return modal;
}

module.exports = { modalPrompt, getPrompt, takePrompt, buildModal };
