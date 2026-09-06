const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'todo',
        description: 'Manage your to-do list',
        usage: ',todo [add/remove/list] [task]'
    },
    aliases: ['todolist'],
    cooldown: 3,

    async execute(message, args) {
        const action = args[0];

        if (!action) return message.reply({ embeds: [errorEmbed('Missing Action', 'Usage: ,todo [add/remove/list] [task]')] });

        if (action === 'add') {
            const task = args.slice(1).join(' ');
            if (!task) return message.reply({ embeds: [errorEmbed('Missing Task', 'Provide a task.')] });
            return message.reply({ embeds: [createEmbed({ color: 0x22c55e, title: 'Task Added', description: task })] });
        }

        if (action === 'list') {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'To-Do List', description: '*To-do lists require a database connection.*' })] });
        }

        if (action === 'remove') {
            return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Task Removed', description: 'Requires a database.' })] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Use `add`, `remove`, or `list`.')] });
    }
};
