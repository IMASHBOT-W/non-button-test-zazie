const { cmd } = require('../command');
const config = require('../config');
const { fetchJson, sleep } = require('../lib/functions');
const prabathApi = "6467ad0b29"; // API key
const api = "https://prabath-md-api.up.railway.app/api/"; // Base API link

// Movie command
cmd({
    pattern: "sinhala",
    alias: ["mv", "moviedl", "mvdl", "cinesub", "cinesubz"],
    desc: "Download movie",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("Please provide the link or name of the movie.");

        // Fetch movie search results
        const searchResults = await fetchJson(`${api}cinesearch?q=${q}&apikey=${prabathApi}`);
        if (!searchResults.data.data.length) return reply("No movies found.");

        // Create a list of movies
        let allMovies = searchResults.data.data.map((movie, index) => `${index + 1}. 🎬 ${movie.title}`).join("\n");
        await reply(`*Cinesubz Movie SEARCH*\n____________________________\n\n*Searched Movies:*\n\n${allMovies}\n\nPlease reply with the number of the movie you want.`);

        // Listen for the user's movie selection
        conn.ev.on('messages.upsert', async (messageUpdate) => {
            const mek2 = messageUpdate.messages[0];
            if (!mek2.message) return;
            const userSelection = mek2.message.conversation || mek2.message.extendedTextMessage?.text;

            // Process movie selection
            const selectedMovieIndex = parseInt(userSelection) - 1;
            const selectedMovie = searchResults.data.data[selectedMovieIndex];

            if (selectedMovie) {
                const movieDetails = await fetchJson(`${api}cinemovie?url=${selectedMovie.link}&apikey=${prabathApi}`);

                // Send movie details
                let movieInfo = `
                🌟 *Movie Details*
                =========================
                *Title:* ${movieDetails.data.mainDetails.maintitle}
                *Release Date:* ${movieDetails.data.mainDetails.dateCreated}
                *Director:* ${movieDetails.data.moviedata.director}
                *Country:* ${movieDetails.data.mainDetails.country}
                *Duration:* ${movieDetails.data.mainDetails.runtime}
                *IMDB Rating:* ${movieDetails.data.moviedata.imdbRating}
                
                *Available Qualities:*
                =========================
                ${movieDetails.data.dllinks.directDownloadLinks.map((link, index) => `${index + 1}. ${link.quality} (${link.size})`).join("\n")}
                `;

                await conn.sendMessage(from, { image: { url: movieDetails.data.mainDetails.imageUrl }, caption: movieInfo });

                // Wait for user to select quality
                conn.ev.on('messages.upsert', async (qualityUpdate) => {
                    const mek3 = qualityUpdate.messages[0];
                    if (!mek3.message) return;
                    const qualitySelection = mek3.message.conversation || mek3.message.extendedTextMessage?.text;

                    const selectedQualityIndex = parseInt(qualitySelection) - 1;
                    const selectedQuality = movieDetails.data.dllinks.directDownloadLinks[selectedQualityIndex];

                    if (selectedQuality) {
                        // Notify about uploading
                        await reply("Uploading...");

                        // Fetch the download link
                        const downloadResponse = await fetchJson(`${api}cinedownload?url=${selectedQuality.link}&apikey=${prabathApi}`);

                        // Send the movie document
                        await conn.sendMessage(from, {
                            document: { url: downloadResponse.data.direct },
                            mimetype: downloadResponse.data.mimeType,
                            fileName: downloadResponse.data.fileName,
                            caption: `Your movie for quality ${selectedQuality.quality} is ready!`
                        });
                    }
                });
            }
        });
    } catch (error) {
        console.error(error);
        await reply("An error occurred. Please try again.");
    }
});

// Movie search command
cmd({
    pattern: "findmovie",
    alias: ["findmv", "searchmovie", "smovie"],
    desc: "Search for movies",
    category: "search",
    react: "🔎",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("Please provide the name of the movie.");

        const data = await fetchJson(`${api}cinesearch?q=${q}&apikey=${prabathApi}`);
        const allMovies = data.data.data.map((app, index) => `${index + 1}. 🎬 ${app.title}\n- ${app.link}`).join("\n\n");

        const message = `*Cinesubz Movie SEARCH*\n____________________________\n\n*Searched Movies:*\n\n${allMovies}`;
        await conn.sendMessage(from, { text: message }, { quoted: mek });
    } catch (error) {
        console.error(error);
        await reply("An error occurred while searching for movies.");
    }
});
