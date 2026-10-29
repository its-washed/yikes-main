const { permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    permission: "bot developer",
    data: { name: 'looplatency', description: 'Returns the latency of the main event loop', usage: ',looplatency' },
    aliases: ['mel', 'll'],
    cooldown: 0,

    async execute(message) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        const enqueueTime = performance.now();
        const actualTask = async () => 'Task completed!';
        await actualTask();
        const executionStartTime = performance.now();
        await Promise.resolve();
        const executionEndTime = performance.now();

        const waitTime = executionStartTime - enqueueTime;
        const executionDuration = executionEndTime - executionStartTime;
        return message.reply(
            `Task was enqueued and waited ${waitTime.toFixed(2)} ms before execution.\n` +
            `Task execution took ${executionDuration.toFixed(2)} ms to complete.`
        );
    }
};
