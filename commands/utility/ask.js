const { warn } = require('../../utils/context');
const { needPerks } = require('../../utils/predicates');

const OPENAI_KEY = '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';

const SYSTEM_PROMPT = "You're Evelina, a helpful assistant, in reality you're GPT-4o-mini with web-search/going on websites capabilities. You're operating on discord, You're a discord bot called Evelina (https://evelina.bot/ , commands at https://evelina.bot/commands) (support: https://discord.gg/evelina , everytime you mention the support discord user < and > tags cause it prevents it from being embedded). Do not mention top.gg or anything else like that. Always provide short answers, as you're used in a discord context. Helpful, straight to the point and concise. Reply using short answers, but make sure to stay informative, if the question requires a longer answer try to make as short as possible.";

module.exports = {
    permission: "donator",
    data: { name: 'ask', description: 'Ask the AI something', usage: ',ask <prompt>' },
    aliases: ['ai'],
    cooldown: 5,

    async execute(message, args, client) {
        if (!await needPerks(message, client)) return;
        const prompt = args.join(' ').trim();
        if (!prompt) return warn(message, 'Usage: `ask <prompt>`');
        const typing = message.channel.sendTyping().catch(() => {});
        let answer;
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
                body: JSON.stringify({
                    model: 'gpt-4o-mini-search-preview',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: prompt }
                    ]
                })
            });
            const data = await res.json();
            answer = data.choices && data.choices[0] ? data.choices[0].message.content : `Error: ${data.error ? data.error.message : 'unknown'}`;
        } catch (e) {
            answer = `Error: ${e.message}`;
        }
        await typing;
        if (answer.length > 2000) return warn(message, 'The response is too long to send');
        return message.reply({ content: answer, allowedMentions: { repliedUser: false } });
    }
};
