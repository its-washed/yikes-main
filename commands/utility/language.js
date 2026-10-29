const { warn, approve } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { first, run, query } = require('../../utils/database');

function isValidLang(value) {
    return /^[a-zA-Z]{2,10}(-[a-zA-Z]{2,10})?$/.test(String(value || ''));
}

function readLanguages(userId) {
    const row = first('SELECT languages FROM language WHERE user_id = ?', userId);
    if (!row || !row.languages) return [];
    try { return JSON.parse(row.languages); } catch (err) { return []; }
}

module.exports = {
    data: { name: 'language', description: "View your current languages or somebody else's", usage: ',language its_washed', params: ['[user]'] },
    aliases: ['lang'],
    cooldown: 5,
    subcommands: ['add', 'remove', 'translate', 'list'],
    subUsages: {
        add: ',language add de',
        remove: ',language remove de',
        translate: ',language translate de',
        list: ',language list'
    },

    async execute(message, args) {
        const user = message.mentions.users.first() || message.author;
        const languages = readLanguages(user.id);
        if (languages.length) {
            return approve(message, `${user.id === message.author.id ? '**Your**' : `**${user.username}'s**`} current languages are: **${languages.join(', ')}**`);
        }
        return warn(message, `${user.id === message.author.id ? '**You** don\u2019t' : `**${user.username}** doesn\u2019t`} have a **language** configured`);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'language add', description: 'Add a language', usage: ',language add de' },
            execute: async (message, args) => {
                const language = String(args[0] || '').toLowerCase();
                if (!isValidLang(language)) return warn(message, 'Invalid language code\n> Usage: `,language add de`');
                const languages = readLanguages(message.author.id);
                if (!languages.includes(language)) languages.push(language);
                run('INSERT INTO language (user_id, languages) VALUES (?, ?) ON CONFLICT (user_id) DO UPDATE SET languages = excluded.languages',
                    message.author.id, JSON.stringify(languages));
                return approve(message, `Added **${language}** to your languages`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'language remove', description: 'Remove a specific language', usage: ',language remove de' },
            execute: async (message, args) => {
                const language = String(args[0] || '').toLowerCase();
                if (!isValidLang(language)) return warn(message, 'Invalid language code\n> Usage: `,language remove de`');
                const languages = readLanguages(message.author.id);
                if (!languages.includes(language)) {
                    return warn(message, `You haven't set **${language}** as one of your languages`);
                }
                const next = languages.filter((entry) => entry !== language);
                if (next.length) {
                    run('UPDATE language SET languages = ? WHERE user_id = ?', JSON.stringify(next), message.author.id);
                } else {
                    run('DELETE FROM language WHERE user_id = ?', message.author.id);
                }
                return approve(message, `Removed **${language}** from your languages`);
            }
        },
        translate: {
            aliases: [],
            data: { name: 'language translate', description: 'Translate a message to a specific language', usage: ',language translate de' },
            execute: async (message, args) => {
                const language = String(args[0] || '').toLowerCase();
                if (!isValidLang(language)) return warn(message, 'Invalid language code\n> Usage: `,language translate de`');
                const ephemeral = !['off', 'false', 'no'].includes(String(args[1] || '').toLowerCase());
                const row = first('SELECT user_id FROM language_translate WHERE user_id = ?', message.author.id);
                if (!row) {
                    run('INSERT INTO language_translate (user_id, language, ephemeral) VALUES (?, ?, ?)',
                        message.author.id, language, ephemeral);
                } else {
                    run('UPDATE language_translate SET language = ?, ephemeral = ? WHERE user_id = ?',
                        language, ephemeral, message.author.id);
                }
                return approve(message, `Set your translation language to **${language}** with ${ephemeral ? 'ephemeral' : 'non-ephemeral'} messages`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'language list', description: "View a list of every member's languages", usage: ',language list' },
            execute: async (message) => {
                const results = query('SELECT * FROM language');
                if (!results.length) return warn(message, 'No one has defined any languages.');
                const entries = results.map((result) => {
                    let languages = [];
                    try { languages = JSON.parse(result.languages); } catch (err) { languages = []; }
                    return `<@${result.user_id}> - **${languages.join(', ')}**`;
                });
                const { paginate } = require('../../utils/context');
                return paginate(message, entries, 'Languages', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        }
    }
};
