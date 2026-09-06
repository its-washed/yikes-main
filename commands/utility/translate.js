const { errorEmbed } = require('../../utils/embeds');
const { createEmbed } = require('../../utils/embeds');

const LANGUAGES = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
    pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
    ar: 'Arabic', hi: 'Hindi', nl: 'Dutch', pl: 'Polish', tr: 'Turkish',
    vi: 'Vietnamese', th: 'Thai', sv: 'Swedish', da: 'Danish', fi: 'Finnish',
    no: 'Norwegian', cs: 'Czech', el: 'Greek', he: 'Hebrew', hu: 'Hungarian',
    ro: 'Romanian', id: 'Indonesian', ms: 'Malnamese', uk: 'Ukrainian', bg: 'Bulgarian',
    hr: 'Croatian', sk: 'Slovak', sl: 'Slovenian', et: 'Estonian', lv: 'Latvian',
    lt: 'Lithuanian', ca: 'Catalan', fa: 'Persian', bn: 'Bengali', sw: 'Swahili',
    tl: 'Filipino', ta: 'Tamil', te: 'Telugu', mr: 'Marathi', gu: 'Gujarati'
};

module.exports = {
    data: {
        name: 'translate',
        description: 'Translate text between languages',
        usage: ',translate [lang] [text]'
    },
    aliases: ['tr'],
    cooldown: 5,

    async execute(message, args) {
        if (args.length < 2) {
            const langList = Object.entries(LANGUAGES).slice(0, 15).map(([k, v]) => `\`${k}\` - ${v}`).join(', ');
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Translation',
                    description: `Usage: ,translate [language code] [text]\n\nSupported languages: ${langList}\n...and more!`
                })]
            });
        }

        const lang = args[0].toLowerCase();
        const text = args.slice(1).join(' ');

        if (!LANGUAGES[lang]) {
            return message.reply({ embeds: [errorEmbed('Unknown Language', 'Use a valid language code like `en`, `es`, `fr`, etc.')] });
        }

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Translation (${LANGUAGES[lang]})`,
                description: `*Note: For actual translation, integrate with a translation API.*\n\n**Original:** ${text}\n**Language:** ${LANGUAGES[lang]}`,
                footer: { text: 'Translation placeholder - connect an API for real translations' }
            })]
        });
    }
};
