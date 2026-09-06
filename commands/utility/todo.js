const { createEmbed, errorEmbed } = require('../../utils/embeds');

const todos = new Map();

module.exports = {
    data: {
        name: 'todo',
        description: 'Manage your to-do list',
        usage: ',todo [add|done|undo|list|clear] [task]'
    },
    aliases: ['todolist', 'tasks'],
    cooldown: 5,

    async execute(message, args) {
        const userId = message.author.id;
        if (!todos.has(userId)) todos.set(userId, []);

        const action = args[0]?.toLowerCase();

        if (!action || action === 'list') {
            const userTodos = todos.get(userId);
            if (userTodos.length === 0) {
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Your To-Do List', description: 'Nothing to do!\nUse `,todo add [task]` to add something.' })] });
            }

            const list = userTodos.map((t, i) => `${t.done ? '✅' : '⬜'} **${i + 1}.** ${t.text}`).join('\n');
            const pending = userTodos.filter(t => !t.done).length;
            const done = userTodos.filter(t => t.done).length;

            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'To-Do List',
                    description: list,
                    footer: { text: `${pending} pending, ${done} completed` }
                })]
            });
        }

        if (action === 'add') {
            const text = args.slice(1).join(' ');
            if (!text) return message.reply({ embeds: [errorEmbed('Missing Task', 'Usage: ,todo add [task]')] });

            const userTodos = todos.get(userId);
            userTodos.push({ text, done: false });
            todos.set(userId, userTodos);

            return message.reply({ embeds: [createEmbed({ color: 0x00d26a, title: 'Task Added', description: text })] });
        }

        if (action === 'done') {
            const idx = parseInt(args[1]) - 1;
            const userTodos = todos.get(userId);

            if (isNaN(idx) || idx < 0 || idx >= userTodos.length) {
                return message.reply({ embeds: [errorEmbed('Invalid Index', 'Provide the task number.')] });
            }

            userTodos[idx].done = true;
            todos.set(userId, userTodos);

            return message.reply({ embeds: [createEmbed({ color: 0x00d26a, title: 'Task Completed', description: userTodos[idx].text })] });
        }

        if (action === 'undo') {
            const idx = parseInt(args[1]) - 1;
            const userTodos = todos.get(userId);

            if (isNaN(idx) || idx < 0 || idx >= userTodos.length) {
                return message.reply({ embeds: [errorEmbed('Invalid Index', 'Provide the task number.')] });
            }

            userTodos[idx].done = false;
            todos.set(userId, userTodos);

            return message.reply({ embeds: [createEmbed({ color: 0xffa502, title: 'Task Uncompleted', description: userTodos[idx].text })] });
        }

        if (action === 'clear') {
            todos.set(userId, []);
            return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Cleared', description: 'All tasks cleared.' })] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Valid: `add`, `done`, `undo`, `list`, `clear`')] });
    }
};
