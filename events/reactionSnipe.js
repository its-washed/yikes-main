const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageReactionRemove,
    once: false,

    async execute(reaction, user) {
        if (user.bot) return;
        const message = reaction.message;
        if (!message.guild) return;
        if (!message.client.reactionSnipes) message.client.reactionSnipes = new Map();

        let label = reaction.emoji.name;
        if (reaction.emoji.id) {
            label = reaction.emoji.animated
                ? `<a:${reaction.emoji.name}:${reaction.emoji.id}>`
                : `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
        }

        const channelId = message.channel.id;
        const list = message.client.reactionSnipes.get(channelId) || [];
        list.unshift({
            reaction: label,
            user: user.id,
            messageId: message.id,
            timestamp: Date.now()
        });
        while (list.length > 25) list.pop();
        message.client.reactionSnipes.set(channelId, list);
    }
};
