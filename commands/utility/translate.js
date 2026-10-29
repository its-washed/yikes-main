const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { warn } = require('../../utils/context');

async function googleTranslate(text, language) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(language)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('translate failed');
    const data = await res.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('bad response');
    return data[0].map(part => part[0] || '').join('');
}

module.exports = {
    data: {
        name: 'translate',
        description: "Translate a message to a specific language",
        usage: ',translate de How are you?', params: ['language', '[text]']
    },
    aliases: ['tr'],
    cooldown: 5,

    async execute(message, args) {
        const language = args[0];
        let text = args.slice(1).join(' ').trim();

        if (!text && message.reference && message.reference.messageId) {
            try {
                const replied = await message.channel.messages.fetch(message.reference.messageId);
                text = replied.content || '';
            } catch (err) {
                if (err.code === 10008) return warn(message, 'The referenced message could not be found.');
                if (err.code === 50001) return warn(message, 'I do not have permission to access the referenced message.');
                return warn(message, 'An error occurred while fetching the referenced message.');
            }
        }

        if (!language) return warn(message, 'Please provide a message to translate or reply to a message.');
        if (!text) return warn(message, 'Please provide a message to translate or reply to a message.');

        try {
            const translated = await googleTranslate(text, language);
            return message.reply({
                embeds: [createEmbed({
                    color: 0x729bb0,
                    title: `Translated to ${language}`,
                    description: '```' + translated + '```'
                })]
            });
        } catch (err) {
            return warn(message, 'This language is **not** supported.\n> Use **language codes** like `en`, `de`, or `fr`.');
        }
    }
};
