const { cmd } = require('../command');
const config = require('../config');
const { fetchJson } = require('../lib/functions');
const prabathApi = "6467ad0b29"; // API key
const api = "https://prabath-md-api.up.railway.app/api/"; // Base API link

let pendingRequests = {}; // Store pending requests for each user

cmd({
    pattern: "csub",
    alias: ["mv", "moviedl", "mvdl", "cinesub", "cinesubz"],
    desc: "Download movie",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, q }) => {
    try {
        if (!q) {
            return await conn.sendMessage(from, { text: "Please provide the name of the movie." }, { quoted: mek });
        }

        // Fetch movie search results
        const response = await fetchJson(`${api}cinesearch?q=${q}&apikey=${prabathApi}`);

        if (!response || !response.data || !response.data.data) {
            return await conn.sendMessage(from, { text: "No movies found or invalid response from the server." }, { quoted: mek });
        }

        const allMovies = response.data.data;

        if (!allMovies.length) {
            return await conn.sendMessage(from, { text: "No movies found." }, { quoted: mek });
        }

        const movieList = allMovies.map((app, index) => `*${index + 1}.* 🎬 ${app.title}`).join("\n");

        const message = `*Cinesubz Movie SEARCH*\n` +
                        `____________________________\n\n` +
                        `*Movies Found:*\n\n` +
                        `${movieList}\n\n` +
                        `Please reply with the number of the movie you want.`;

        const sentMsg = await conn.sendMessage(from, { text: message }, { quoted: mek });
        const messageID = sentMsg.key.id;

        // Store pending request for the user
        pendingRequests[from] = { allMovies, messageID };

        // Listen for the user's response to select a movie
        conn.ev.on('messages.upsert', async (messageUpdate) => {
            const mek = messageUpdate.messages[0];
            if (!mek.message) return;

            const userResponse = mek.message.conversation || mek.message.extendedTextMessage?.text;
            const userSelectedNumber = parseInt(userResponse);

            const isReplyToSentMsg = mek.message.extendedTextMessage && mek.message.extendedTextMessage.contextInfo.stanzaId === messageID;

            if (isReplyToSentMsg && userSelectedNumber && userSelectedNumber <= allMovies.length) {
                const selectedMovie = allMovies[userSelectedNumber - 1];

                if (!selectedMovie || !selectedMovie.link) {
                    return await conn.sendMessage(from, { text: "Invalid movie selection. Please try again." }, { quoted: mek });
                }

                // Fetch movie details
                const movieDetailsResponse = await fetchJson(`${api}cinemovie?url=${selectedMovie.link}&apikey=${prabathApi}`);

                if (!movieDetailsResponse || !movieDetailsResponse.data) {
                    return await conn.sendMessage(from, { text: "Error fetching movie details." }, { quoted: mek });
                }

                const desc = movieDetailsResponse.data;

                let movieTitle = desc.mainDetails.maintitle || "N/A";
                let releaseDate = desc.mainDetails.dateCreated || "N/A";
                let directorName = desc.moviedata.director || "N/A";
                let country = desc.mainDetails.country || "N/A";
                let duration = desc.mainDetails.runtime || "N/A";
                let imdbRating = desc.moviedata.imdbRating || "N/A";
                let qualities = desc.dllinks.directDownloadLinks.map((link, index) => `> ${index + 1}. ${link.quality} (${link.size})`).join("\n");
                let imageUrl = desc.mainDetails.imageUrl;

                let detailMessage = `
🌟 *Movie Details* 🌟
=========================
*Title:* ${movieTitle}
*Release Date:* ${releaseDate}
*Director:* ${directorName}
*Country:* ${country}
*Duration:* ${duration}
*IMDB Rating:* ${imdbRating}

*Available Qualities:* 
=========================
${qualities}
`;

                // Send the image with the movie details as the caption
                await conn.sendMessage(from, {
                    image: { url: imageUrl },
                    caption: detailMessage,
                    footer: "Powered by Cinesubz"
                }, { quoted: mek });

                // Store the selected movie and its quality links for later
                pendingRequests[from].selectedMovie = selectedMovie;
                pendingRequests[from].qualityLinks = desc.dllinks.directDownloadLinks;

                // Listen for quality selection
                conn.ev.on('messages.upsert', async (messageUpdate2) => {
                    const mek2 = messageUpdate2.messages[0];
                    if (!mek2.message) return;

                    const qualityResponse = mek2.message.conversation || mek2.message.extendedTextMessage?.text;
                    const userSelectedQuality = parseInt(qualityResponse);

                    const isReplyToQualityMsg = mek2.message.extendedTextMessage && mek2.message.extendedTextMessage.contextInfo.stanzaId === messageID;

                    // If user selects a valid quality number
                    if (isReplyToQualityMsg && userSelectedQuality && userSelectedQuality <= pendingRequests[from].qualityLinks.length) {
                        const selectedQuality = pendingRequests[from].qualityLinks[userSelectedQuality - 1];

                        // Set "uploading" reaction
                        await conn.sendMessage(from, { react: { text: '🔄', key: mek2.key } }); // Assuming '🔄' is the uploading reaction

                        // Fetch download link
                        const downloadResponse = await fetchJson(`${api}cinedownload?url=${selectedQuality.link}&apikey=${prabathApi}`);

                        if (!downloadResponse || !downloadResponse.data || !downloadResponse.data.direct) {
                            return await conn.sendMessage(from, { text: "Error fetching download link." }, { quoted: mek2 });
                        }

                        // Send the movie document
                        await conn.sendMessage(from, {
                            document: { url: downloadResponse.data.direct },
                            mimetype: downloadResponse.data.mimeType,
                            fileName: downloadResponse.data.fileName,
                            caption: `Your movie "${pendingRequests[from].selectedMovie.title}" in quality ${selectedQuality.quality} is ready!`
                        }, { quoted: mek2 });

                        // Set "successful" reaction after sending the document
                        await conn.sendMessage(from, { react: { text: '✅', key: mek2.key } }); // Assuming '✅' is the successful reaction

                        // Remove the request from pending after processing
                        delete pendingRequests[from];
                    }
                });
            } else {
                // No message for invalid selection
            }
        });
    } catch (e) {
        console.log("Error: ", e.message);
        return await conn.sendMessage(from, { text: `An error occurred: ${e.message}` }, { quoted: mek });
    }
});
