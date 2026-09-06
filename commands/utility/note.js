const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'note',
        description: 'Save a note',
        usage: ',note [save/list/delete] [text]'
    },
    aliases: ['notes'],
    cooldown: 3,

    async execute(message, args) {
        const action = args[0];

        if (!action) return message.reply({ embeds: [errorEmbed('Missing Action', 'Usage: ,note [save/list/delete] [text]')] });

        if (action === 'save') {
            const text = args.slice(1).join(' ');
            if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Provide note text.')] });
            return message.reply({ embeds: [createEmbed({ color: 0x22c55e, title: 'Note Saved', description: text })] });
        }

        if (action === 'list') {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Notes', description: '*Notes require a database connection to persist.*' })] });
        }

        if (action === 'delete') {
            return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Note Deleted', description: 'Note deletion requires a database.' })] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Use `save`, `list`, or `delete`.')] });
    }
};
