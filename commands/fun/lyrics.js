const { createEmbed } = require('../../utils/embeds');
const { warn } = require('../../utils/context');
const { Paginator } = require('../../utils/pagination');

function decodeEntities(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

function extractLyrics(html) {
    const source = html.replace(/<br\s*\/?>/gi, '\n');
    const blocks = [];
    const re = /<div[^>]*class="([^"]*)"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*(?:lyrics|Lyrics__Container)|$)/gi;
    let match;
    while ((match = re.exec(source)) !== null) {
        const classes = match[1];
        if (!/(^|\s)(lyrics|Lyrics__Container)(\s|$)/.test(classes) && classes !== 'lyrics') continue;
        blocks.push(match[2]);
    }
    if (!blocks.length) {
        const generic = source.match(/<div[^>]*class="[^"]*Lyrics__Container[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);
        if (generic) blocks.push(...generic.map(b => b.replace(/<div[^>]*class="[^"]*"[^>]*>/gi, '').replace(/<\/div>/gi, '')));
    }

    let text = blocks
        .map(b => b.replace(/<[^>]+>/g, ''))
        .join('')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    text = decodeEntities(text);
    return text.replace(/^\n+|\n+$/g, '');
}

function organizeSections(lyrics) {
    const sectionPattern = /\[.*?\]/;
    const parts = lyrics.split(/(\[.*?\])/);
    const sections = [];
    let header = '';
    let body = '';

    for (const part of parts) {
        if (sectionPattern.test(part) && part.startsWith('[')) {
            if (body.trim()) sections.push({ header, content: body.trim() });
            header = part;
            body = '';
        } else {
            body += part;
        }
    }
    if (body.trim()) sections.push({ header, content: body.trim() });
    if (!sections.length) sections.push({ header: '', content: lyrics });
    return sections;
}

module.exports = {
    data: { name: 'lyrics', description: "Get the lyrics for a song", usage: ',lyrics yeat, king tonka', params: ['song'] },
    cooldown: 5,

    async execute(message, args) {
        let song = args.join(' ').trim();

        if (!song) {
            const activities = (message.member && message.member.presence && message.member.presence.activities) || [];
            for (const activity of activities) {
                if (activity.type === 'SPOTIFY') {
                    song = `${activity.title} ${activity.artist || ''}`.trim();
                    break;
                }
                if (activity.type === 'LISTENING' && activity.details) {
                    song = activity.details;
                    break;
                }
            }
            if (!song) return warn(message, 'Please provide a song name to search for');
        }

        try {
            await message.channel.sendTyping().catch(() => {});

            const searchRes = await fetch(`https://genius.com/api/search/multi?q=${encodeURIComponent(song)}`);
            const resp = await searchRes.json();

            let track = null;
            const sections = (resp && resp.response && resp.response.sections) || [];
            for (const section of sections) {
                for (const hit of section.hits || []) {
                    if (hit.index === 'song') { track = hit.result; break; }
                }
                if (track) break;
            }
            if (!track) return warn(message, "Couldn't find lyrics for this song");

            const htmlRes = await fetch(track.url);
            const html = await htmlRes.text();

            const raw = extractLyrics(html);
            if (!raw) return warn(message, "Couldn't find lyrics for this song");

            const organized = organizeSections(raw);
            const total = organized.length;

            const pages = organized.map((section, i) => {
                const sectionText = section.header ? `${section.header}\n${section.content}` : section.content;
                const embed = createEmbed({
                    color: 0x729bb0,
                    title: track.title,
                    url: track.url,
                    description: '```yaml\n' + sectionText.slice(0, 3900) + '```',
                    author: track.primary_artist
                        ? { name: track.primary_artist.name, icon_url: track.primary_artist.image_url, url: track.primary_artist.url }
                        : undefined,
                    thumbnail: track.song_art_image_url ? { url: track.song_art_image_url } : undefined,
                    footer: { text: `${i + 1}/${total} • ${track.release_date_for_display || 'Unknown Release Date'}` }
                });
                return embed;
            });

            const paginator = new Paginator(pages, { userId: message.author.id });
            const sent = await message.reply({ embeds: paginator.buildEmbeds(), components: pages.length > 1 ? [paginator.buildRow()] : [] });
            if (pages.length > 1) await paginator.start(message.channel, sent);
            return sent;
        } catch (err) {
            return warn(message, `An error occurred while trying to fetch the lyrics for **${song}**: ${err.message}`);
        }
    }
};
