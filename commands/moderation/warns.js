module.exports = {
    data: { name: 'warns', description: 'Shows all warns of an user', usage: ',warns <member>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        return require('./warn').subs.list.execute(message, args, client);
    }
};
