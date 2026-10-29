const { warn } = require('../../utils/context');
const { needPerks } = require('../../utils/predicates');

module.exports = {
    permission: "donator",
    data: { name: 'selfpurge', description: 'Delete your own messages', usage: ',selfpurge [amount]' },
    aliases: [],
    cooldown: 10,

    async execute(message, args, client) {
        if (!await needPerks(message, client)) return;
        const amount = args[0] ? parseInt(args[0], 10) : 100;
        if (!Number.isFinite(amount) || amount < 1) return warn(message, 'Usage: `selfpurge [amount]`');
        try {
            const fetched = await message.channel.messages.fetch({ limit: Math.min(amount + 1, 100) });
            const mine = fetched.filter(m => m.author.id === message.author.id && !m.pinned);
            const deletable = mine.filter(m => m.id !== message.id).first(Math.min(amount, 100));
            if (deletable.length) await message.channel.bulkDelete(deletable, true).catch(() => {});
            const rest = mine.filter(m => m.id !== message.id && !deletable.includes(m));
            for (const m of rest.values()) await m.delete().catch(() => {});
        } catch {
            return warn(message, 'Failed to delete your messages in this channel');
        }
    }
};
