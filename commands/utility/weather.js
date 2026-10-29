const { createEmbed } = require('../../utils/embeds');
const { warn } = require('../../utils/context');

module.exports = {
    data: { name: 'weather', description: "Gets simple weather from OpenWeatherMap", usage: ',weather vienna', params: ['location'] },
    cooldown: 5,

    async execute(message, args) {
        const city = args.join(' ').trim();
        if (!city) return warn(message, 'Usage: `weather <city>`');

        try {
            const res = await fetch(`https://api.evelina.bot/weather?city=${encodeURIComponent(city)}&key=X3pZmLq82VnHYTd6Cr9eAw`);
            const data = await res.json();

            if (!data || data.message !== undefined) {
                return warn(message, `Couldn't get information about **${city}**`);
            }

            return message.reply({
                embeds: [createEmbed({
                    color: 0x349BDB,
                    title: `${data.condition} in ${data.city}, ${data.country}`,
                    author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
                    thumbnail: data.condition_image ? { url: data.condition_image.startsWith('//') ? `https:${data.condition_image}` : data.condition_image } : undefined,
                    fields: [
                        { name: 'Temperature', value: `${data.temp_c} °C / ${data.temp_f} °F`, inline: true },
                        { name: 'Wind', value: `${data.wind_mph} mph / ${data.wind_kph} kph`, inline: true },
                        { name: 'Humidity', value: `${data.humidity}%`, inline: true }
                    ]
                })]
            });
        } catch (err) {
            return warn(message, `Couldn't get information about **${city}**`);
        }
    }
};
