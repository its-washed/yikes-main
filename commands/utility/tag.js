const { PermissionFlagsBits } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { first, run, query } = require('../../utils/database');
const { sendCard } = require('../../utils/helpCard');
const { altConvert, scriptPayload } = require('../../utils/embedScript');

function guildAuthor(message) {
    return {
        name: message.guild.name,
        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
    };
}

function splitArgs(raw) {
    const index = raw.indexOf(',');
    if (index === -1) return null;
    return [raw.slice(0, index).trim(), raw.slice(index + 1).trim()];
}

module.exports = {
    data: { name: 'tag', description: 'View a tag', usage: ',tag <name>' },
    aliases: ['tags'],
    cooldown: 3,
    subcommands: ['add', 'remove', 'reset', 'list', 'random', 'edit', 'author', 'search'],
    subUsages: {
        add: ',tag add pic, Boost us for pic perms',
        remove: ',tag remove pic',
        reset: ',tag reset',
        list: ',tag list',
        random: ',tag random',
        edit: ',tag edit pic, Boost us for pic perms',
        author: ',tag author pic',
        search: ',tag search pic'
    },
    execute: async (message, args, client) => {
        const name = args.join(' ').trim();
        if (!name) return warn(message, 'Usage: `tag <name>`');
        const tag = first('SELECT * FROM tags WHERE guild_id = ? AND name = ?', message.guild.id, name);
        if (!tag) return warn(message, `No tag found for **${name}**`);
        if (tag.response) return message.reply({ content: tag.response });
        return warn(message, 'The tag exists but has no content.');
    },
    subs: {
        add: {
            aliases: ['create'],
            data: { name: 'tag add', description: 'Add a tag to guild', usage: ',tag add pic, Boost us for pic perms' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const parts = splitArgs(args.join(' '));
                if (!parts) {
                    return warn(message, 'No response found. Make sure to use a `,` to split the trigger from the response');
                }
                const [name, response] = parts;
                if (!name || !response) {
                    return warn(message, 'No response found. Make sure to use a `,` to split the trigger from the response');
                }
                if (first('SELECT 1 AS ok FROM tags WHERE guild_id = ? AND name = ?', message.guild.id, name)) {
                    return warn(message, `A tag for **${name}** already exists!`);
                }
                run('INSERT INTO tags (guild_id, author_id, name, response) VALUES (?, ?, ?, ?)',
                    message.guild.id, message.author.id, name, response);
                return approve(message, `Added tag for **${name}**\n\`\`\`${response}\`\`\``);
            }
        },
        remove: {
            aliases: ['delete', 'del'],
            data: { name: 'tag remove', description: 'Remove a tag from guild', usage: ',tag remove pic' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'Usage: `tag remove <name>`');
                if (!first('SELECT 1 AS ok FROM tags WHERE guild_id = ? AND name = ?', message.guild.id, name)) {
                    return warn(message, 'That is **not** an existing tag');
                }
                run('DELETE FROM tags WHERE guild_id = ? AND name = ?', message.guild.id, name);
                return approve(message, `Deleted the tag **${name}**`);
            }
        },
        reset: {
            aliases: [],
            data: { name: 'tag reset', description: 'Reset every tag for this guild', usage: ',tag reset' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!first('SELECT 1 AS ok FROM tags WHERE guild_id = ?', message.guild.id)) {
                    return warn(message, 'There are **no** tags set');
                }
                return confirm(message, `${message.author}: Are you sure you want to **delete** all tags?`,
                    async i => {
                        run('DELETE FROM tags WHERE guild_id = ?', message.guild.id);
                        return i.update({ embeds: [require('../../utils/embeds').successEmbed(null, `${i.user}: Removed all **tags**`)], components: [] }).catch(() => {});
                    },
                    async i => {
                        return i.update({ embeds: [require('../../utils/embeds').errorEmbed(null, `${i.user}: Tags deletion got canceled`)], components: [] }).catch(() => {});
                    });
            }
        },
        list: {
            aliases: [],
            data: { name: 'tag list', description: 'View a list of every tag in guild', usage: ',tag list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const rows = query('SELECT * FROM tags WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'There are **no** tags set');
                return paginate(message, rows.map(row => `${row.name} - ${row.response}`), 'Tags', guildAuthor(message));
            }
        },
        random: {
            aliases: [],
            data: { name: 'tag random', description: 'Return a random tag', usage: ',tag random' },
            execute: async (message) => {
                const result = first('SELECT * FROM tags WHERE guild_id = ? ORDER BY RANDOM() LIMIT 1', message.guild.id);
                if (!result) return warn(message, 'There are **no** tags set');
                let payload;
                try {
                    payload = scriptPayload(altConvert(message.member, result.response || ''));
                } catch {
                    payload = { content: result.response };
                }
                payload.content = `(${result.name}) ${payload.content || ''}`;
                return message.reply(payload);
            }
        },
        edit: {
            aliases: [],
            data: { name: 'tag edit', description: 'Edit the contents of your tag', usage: ',tag edit pic, Boost us for pic perms' },
            execute: async (message, args) => {
                const parts = splitArgs(args.join(' '));
                if (!parts) {
                    return warn(message, 'No response found. Make sure to use a `,` to split the trigger from the response');
                }
                const [name, response] = parts;
                if (!name || !response) {
                    return warn(message, 'No response found. Make sure to use a `,` to split the trigger from the response');
                }
                const check = first('SELECT * FROM tags WHERE guild_id = ? AND name = ?', message.guild.id, name);
                if (!check) return warn(message, `No tag found for **${name}**`);
                if (String(check.author_id) !== message.author.id) {
                    return warn(message, 'You are not the **author** of this tag');
                }
                run('UPDATE tags SET response = ? WHERE guild_id = ? AND name = ?', response, message.guild.id, name);
                return approve(message, `Updated tag for **${name}**\n\`\`\`${response}\`\`\``);
            }
        },
        author: {
            aliases: ['creator'],
            data: { name: 'tag author', description: 'View the author of a tag', usage: ',tag author pic' },
            execute: async (message, args) => {
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'Usage: `tag author <name>`');
                const check = first('SELECT * FROM tags WHERE guild_id = ? AND name = ?', message.guild.id, name);
                if (!check) return warn(message, `No tag found for **${name}**`);
                const user = await message.client.users.fetch(String(check.author_id)).catch(() => null);
                return message.reply({ content: `The author of this tag is **${user || check.author_id}**` });
            }
        },
        search: {
            aliases: [],
            data: { name: 'tag search', description: 'Search for tags containing a keyword', usage: ',tag search pic' },
            execute: async (message, args) => {
                const queryText = args.join(' ').trim();
                if (!queryText) return warn(message, 'Usage: `tag search <query>`');
                const rows = query('SELECT * FROM tags WHERE guild_id = ? AND name LIKE ?', message.guild.id, `%${queryText}%`);
                if (!rows.length) return warn(message, 'No **tags** found');
                return paginate(message, rows.map(row => `**${row.name}**`), `Tags like ${queryText}`);
            }
        }
    }
};
