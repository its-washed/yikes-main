const { first } = require('../../utils/database');
const { warn } = require('../../utils/context');
const { modalPrompt } = require('../../utils/modal');
const { submitConfession } = require('../../utils/confessions');

module.exports = {
    data: { name: 'confess', description: 'Confess your thoughts', usage: ',confess' },
    aliases: [],
    cooldown: 10,

    async execute(message, args, client) {
        const muted = first('SELECT * FROM confess_mute WHERE guild_id = ? AND user_id = ?', message.guild.id, message.author.id);
        if (muted) return warn(message, 'You are **muted** from sending confessions in this server');
        const check = first('SELECT channel_id FROM confess WHERE guild_id = ?', message.guild.id);
        if (!check) return warn(message, "Confessions aren't enabled in this server");
        return modalPrompt(message, {
            prompt: 'Open the form below to submit your confession.',
            title: 'Submit a Confession',
            buttonLabel: 'Open form',
            fields: [
                { label: 'Confession Content', placeholder: 'Enter your confession here...', multiline: true, required: true },
                { label: 'Attachment (Optional)', placeholder: 'https://...', required: false }
            ],
            onSubmit: async (interaction, values) => submitConfession(interaction, values[0] || '', values[1] || '')
        });
    }
};
