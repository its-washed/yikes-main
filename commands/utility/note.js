const { createEmbed, errorEmbed } = require('../../utils/embeds');

const notes = new Map();

module.exports = {
    data: {
        name: 'note',
        description: 'Save and manage personal notes',
        usage: ',note [add|view|delete|list] [text]'
    },
    aliases: ['notes'],
    cooldown: 5,

    async execute(message, args) {
        const userId = message.author.id;
        if (!notes.has(userId)) notes.set(userId, []);

        const action = args[0]?.toLowerCase();

        if (!action || action === 'list') {
            const userNotes = notes.get(userId);
            if (userNotes.length === 0) {
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Your Notes', description: 'No notes yet.\nUse `,note add [text]` to create one.' })] });
            }

            const list = userNotes.map((n, i) => `**${i + 1}.** ${n.text} — <t:${Math.floor(n.timestamp / 1000)}:R>`).join('\n');
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Notes (${userNotes.length})`, description: list })] });
        }

        if (action === 'add') {
            const text = args.slice(1).join(' ');
            if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,note add [text]')] });

            const userNotes = notes.get(userId);
            userNotes.push({ text, timestamp: Date.now() });
            notes.set(userId, userNotes);

            return message.reply({ embeds: [createEmbed({ color: 0x00d26a, title: 'Note Saved', description: text })] });
        }

        if (action === 'delete' || action === 'remove') {
            const idx = parseInt(args[1]) - 1;
            const userNotes = notes.get(userId);

            if (isNaN(idx) || idx < 0 || idx >= userNotes.length) {
                return message.reply({ embeds: [errorEmbed('Invalid Index', 'Provide the note number to delete.')] });
            }

            const deleted = userNotes.splice(idx, 1)[0];
            notes.set(userId, userNotes);

            return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Note Deleted', description: deleted.text })] });
        }

        if (action === 'view') {
            const idx = parseInt(args[1]) - 1;
            const userNotes = notes.get(userId);

            if (isNaN(idx) || idx < 0 || idx >= userNotes.length) {
                return message.reply({ embeds: [errorEmbed('Invalid Index', 'Provide the note number to view.')] });
            }

            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Note #${idx + 1}`, description: userNotes[idx].text })] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Valid: `add`, `view`, `delete`, `list`')] });
    }
};
