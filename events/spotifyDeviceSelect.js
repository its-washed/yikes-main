const { Events } = require('discord.js');
const { run } = require('../utils/database');
const { COLORS, EMOJIS } = require('../utils/styles');

module.exports = {
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction) {
        if (!interaction.isStringSelectMenu()) return;
        if (interaction.customId !== 'spotify_device_select') return;

        const spotify = require('../commands/utility/spotify');
        const pending = spotify.pendingDevices && spotify.pendingDevices.get(interaction.message.id);
        if (!pending) {
            return interaction.reply({ content: 'This menu has expired.', ephemeral: true }).catch(() => {});
        }
        const deviceId = interaction.values[0];
        const device = pending.devices.find(d => d.id === deviceId);
        if (!device) {
            return interaction.reply({ content: 'An error occurred white selecting devices', ephemeral: true }).catch(() => {});
        }
        run('INSERT INTO spotify_devices (discord_id, device_id) VALUES (?, ?) ON CONFLICT (discord_id) DO UPDATE SET device_id = ?',
            pending.userId, deviceId, deviceId);
        try {
            await fetch('https://api.spotify.com/v1/me/player', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${pending.accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_ids: [deviceId], play: false })
            });
        } catch {
        }
        await interaction.message.edit({
            embeds: [{ color: COLORS.SPOTIFY, description: `${EMOJIS.SPOTIFY} ${interaction.user.mention}: Selected device: **${device.name}**` }],
            components: []
        }).catch(() => {});
        spotify.pendingDevices.delete(interaction.message.id);
        return interaction.deferUpdate().catch(() => {});
    }
};
