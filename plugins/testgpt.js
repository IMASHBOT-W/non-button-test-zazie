const { cmd } = require('../command');
const config = require('../config');
const { fetchJson } = require('../lib/functions');
const prabathApi = "6467ad0b29"; // API key
const api = "https://prabath-md-api.up.railway.app/api/";

let pendingRequests = {}; // To track user requests and quality selection

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
        const message = `*Cinesubz Movie Search*\n\nMovies Found:\n${movieList}\n\nPlease reply with the number of the movie you want.`;

        const sentMsg = await conn.sendMessage(from, { text: message }, { quoted: mek });
        const messageID = sentMsg.key.id;

        // Store movie list in pendingRequests to use later
        pendingRequests[from] = { allMovies, messageID };

        // Log for debugging purposes
        console.log("Stored pendingRequests: ", pendingRequests[from]);

        // Listen for the user's selection of movie number
        conn.ev.on('messages.upsert', async (messageUpdate) => {
            const mek = messageUpdate.messages[0];
            if (!mek.message) return;

            const userResponse = mek.message.conversation || mek.message.extendedTextMessage?.text;
            const userSelectedNumber = parseInt(userResponse);

            // Debugging log
            console.log("User selected movie number: ", userSelectedNumber);

            const isReplyToSentMsg = mek.message.extendedTextMessage && mek.message.extendedTextMessage.contextInfo.stanzaId === messageID;

            if (isReplyToSentMsg && userSelectedNumber && userSelectedNumber <= allMovies.length) {
                const selectedMovie = allMovies[userSelectedNumber - 1];

                if (!selectedMovie || !selectedMovie.link) {
                    return; // Removed invalid selection message
                }

                // Fetch movie details
                const movieDetailsResponse = await fetchJson(`${api}cinemovie?url=${selectedMovie.link}&apikey=${prabathApi}`);
                if (!movieDetailsResponse || !movieDetailsResponse.data) {
                    return await conn.sendMessage(from, { text: "Error fetching movie details." }, { quoted: mek });
                }

                const desc = movieDetailsResponse.data;
                let qualities = desc.dllinks.directDownloadLinks.map((link, index) => `> ${index + 1}. ${link.quality} (${link.size})`).join("\n");

                const detailMessage = `
🌟 *Movie Details* 🌟
=========================
*Title:* ${desc.mainDetails.maintitle || "N/A"}
*Release Date:* ${desc.mainDetails.dateCreated || "N/A"}
*Director:* ${desc.moviedata.director || "N/A"}
*Country:* ${desc.mainDetails.country || "N/A"}
*Duration:* ${desc.mainDetails.runtime || "N/A"}
*IMDB Rating:* ${desc.moviedata.imdbRating || "N/A"}

*Available Qualities:* 
=========================
${qualities}
`;

                // Send movie details with available quality options
                await conn.sendMessage(from, {
                    image: { url: desc.mainDetails.imageUrl },
                    caption: detailMessage,
                    footer: "Powered by Cinesubz"
                }, { quoted: mek });

                // Store selected movie and quality links in pendingRequests
                pendingRequests[from].selectedMovie = selectedMovie;
                pendingRequests[from].qualityLinks = desc.dllinks.directDownloadLinks;

                // Debugging log
                console.log("Stored selected movie and qualities: ", pendingRequests[from]);

                const qualityMessage = `Please reply with the number of the quality you want.`;
                await conn.sendMessage(from, { text: qualityMessage }, { quoted: mek });

                // Listen for the user to select a quality
                conn.ev.on('messages.upsert', async (messageUpdate2) => {
                    const mek2 = messageUpdate2.messages[0];
                    if (!mek2.message) return;

                    const qualityResponse = mek2.message.conversation || mek2.message.extendedTextMessage?.text;
                    const userSelectedQuality = parseInt(qualityResponse);

                    // Ensure the user is replying to the quality message
                    const isReplyToQualityMsg = mek2.message.extendedTextMessage && mek2.message.extendedTextMessage.contextInfo.stanzaId === messageID;

                    // Debugging log
                    console.log("User selected quality: ", userSelectedQuality);

                    if (isReplyToQualityMsg && userSelectedQuality && userSelectedQuality <= pendingRequests[from].qualityLinks.length) {
                        const selectedQuality = pendingRequests[from].qualityLinks[userSelectedQuality - 1];

                        // Set "Uploading" reaction
                        await conn.sendMessage(from, { react: { text: '🔄', key: mek2.key } });

                        // Fetch download link for the selected quality
                        const downloadResponse = await fetchJson(`${api}cinedownload?url=${selectedQuality.link}&apikey=${prabathApi}`);

                        if (!downloadResponse || !downloadResponse.data || !downloadResponse.data.direct) {
                            return await conn.sendMessage(from, { text: "Error fetching download link." }, { quoted: mek2 });
                        }

                        // Send the movie document based on selected quality
                        await conn.sendMessage(from, {
                            document: { url: downloadResponse.data.direct },
                            mimetype: downloadResponse.data.mimeType,
                            fileName: downloadResponse.data.fileName,
                            caption: `Your movie "${pendingRequests[from].selectedMovie.title}" in quality ${selectedQuality.quality} is ready!`
                        }, { quoted: mek2 });

                        // Set "Successful" reaction after sending the document
                        await conn.sendMessage(from, { react: { text: '✅', key: mek2.key } });

                        // Clear pending requests
                        delete pendingRequests[from];
                    }
                });
            }
        });
    } catch (e) {
        console.log("Error: ", e.message);
        return await conn.sendMessage(from, { text: `An error occurred: ${e.message}` }, { quoted: mek });
    }
});
