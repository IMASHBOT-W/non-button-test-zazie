const { cmd } = require('../command');
const config = require('../config');
const { fetchJson, sleep } = require('../lib/functions');
const prabathApi = "6467ad0b29"; // API key
const api = "https://prabath-md-api.up.railway.app/api/"; // Base API link

cmd({
    pattern: "csub",
    alias: ["mv", "moviedl", "mvdl", "cinesub", "cinesubz"],
    desc: "movie",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q }) => {
    try {
        if (!q) {
            return await conn.reply(from, "Please provide the name of the movie.", mek);
        }

        // Search for movies
        let searchResult = await fetchJson(`${api}cinesearch?q=${q}&apikey=${prabathApi}`);
        if (!searchResult.data || searchResult.data.length === 0) {
            return await conn.reply(from, "No movies found.", mek);
        }

        // Display movies
        const allMovies = searchResult.data.map((app, index) => `*${index + 1}.* 🎬 ${app.title}`).join('\n');
        const message = `*Cinesubz Movie SEARCH*\n____________________________\n\n*Movies Found:*\n\n${allMovies}\n\nPlease reply with the number of the movie you want.`;
        const searchMsg = await conn.reply(from, message, mek);

        // Wait for user's response
        conn.ev.on('messages.upsert', async (messageUpdate) => {
            const mek = messageUpdate.messages[0];
            if (!mek.message) return;

            const userResponse = mek.message.conversation || mek.message.extendedTextMessage?.text;
            const sender = mek.key.participant || mek.key.remoteJid;

            // Check if the response is valid
            if (!isNaN(userResponse)) {
                const selectedMovieIndex = parseInt(userResponse) - 1;
                const selectedMovie = searchResult.data[selectedMovieIndex];

                // Get movie details
                let details = await fetchJson(`${api}cinemovie?url=${selectedMovie.link}&apikey=${prabathApi}`);
                let movieDetails = details.data;
                const qualityOptions = movieDetails.dllinks.directDownloadLinks.map((link, index) => `> ${index + 1}. ${link.quality} (${link.size})`).join("\n");

                const detailMessage = `
🌟 *Movie Details* 🌟
=========================
*Title:* ${movieDetails.mainDetails.maintitle}
*Release Date:* ${movieDetails.mainDetails.dateCreated}
*Director:* ${movieDetails.moviedata.director}
*Country:* ${movieDetails.mainDetails.country}
*Duration:* ${movieDetails.mainDetails.runtime}
*IMDB Rating:* ${movieDetails.moviedata.imdbRating}

*Available Qualities:*
=========================
${qualityOptions}

Please reply with the quality number you want.
                `;

                // Send the image with movie details
                await conn.sendMessage(sender, {
                    image: { url: movieDetails.mainDetails.imageUrl },
                    caption: detailMessage
                });

                // Wait for quality selection
                conn.ev.on('messages.upsert', async (qualityUpdate) => {
                    const qualityMek = qualityUpdate.messages[0];
                    const qualityResponse = qualityMek.message.conversation || qualityMek.message.extendedTextMessage?.text;

                    // Check quality selection
                    const qualityIndex = parseInt(qualityResponse) - 1;
                    const selectedQuality = movieDetails.dllinks.directDownloadLinks[qualityIndex];

                    if (!selectedQuality) {
                        return await conn.reply(sender, "Please select a valid quality number.", qualityMek);
                    }

                    // Send uploading message
                    await conn.reply(sender, "Uploading your movie...", qualityMek);

                    // Fetch download link
                    const downloadLink = await fetchJson(`${api}cinedownload?url=${selectedQuality.link}&apikey=${prabathApi}`);

                    // Send the document
                    await conn.sendMessage(sender, {
                        document: { url: downloadLink.data.direct },
                        mimetype: downloadLink.data.mimeType,
                        fileName: downloadLink.data.fileName,
                        caption: `Your movie "${movieDetails.mainDetails.maintitle}" in quality ${selectedQuality.quality} is ready!`
                    });
                });
            }
        });
    } catch (error) {
        console.error(error);
        await conn.reply(from, "An error occurred. Please try again.", mek);
    }
});
