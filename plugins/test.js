const { cmd } = require('../command');
const config = require('../config');
const { fetchJson } = require('../lib/functions');
const prabathApi = "6467ad0b29"; // API key
const api = "https://prabath-md-api.up.railway.app/api/"; // Base API link

cmd({
    pattern: "sinhala",
    alias: ["mv", "moviedl", "mvdl", "cinesub", "cinesubz"],
    desc: "Download movie",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q }) => {
    try {
        if (!q) {
            return await conn.sendMessage(from, { text: "Please provide the name of the movie." }, { quoted: mek });
        }

        const response = await fetchJson(`${api}cinesearch?q=${q}&apikey=${prabathApi}`);

        if (!response || !response.data || !response.data.data) {
            return await conn.sendMessage(from, { text: "No movies found or invalid response from the server." }, { quoted: mek });
        }

        const allMovies = response.data.data;

        if (!allMovies.length) {
            return await conn.sendMessage(from, { text: "No movies found." }, { quoted: mek });
        }

        const movieList = allMovies.map((app, index) => {
            return `*${index + 1}.* 🎬 ${app.title}`;
        }).join("\n");

        const message = `*Cinesubz Movie SEARCH*\n` +
                        `____________________________\n\n` +
                        `*Movies Found:*\n\n` +
                        `${movieList}\n\n` +
                        `Please reply with the number of the movie you want.`;

        const sentMsg = await conn.sendMessage(from, { text: message }, { quoted: mek });
        const messageID = sentMsg.key.id;

        conn.ev.on('messages.upsert', async (messageUpdate) => {
            const mek = messageUpdate.messages[0];
            if (!mek.message) return;

            const userResponse = mek.message.conversation || mek.message.extendedTextMessage?.text;
            const userSelectedNumber = parseInt(userResponse);

            const isReplyToSentMsg = mek.message.extendedTextMessage && mek.message.extendedTextMessage.contextInfo.stanzaId === messageID;

            // If the user selects a valid movie number
            if (isReplyToSentMsg && userSelectedNumber && userSelectedNumber <= allMovies.length) {
                const selectedMovie = allMovies[userSelectedNumber - 1];

                if (!selectedMovie || !selectedMovie.link) {
                    return;
                }

                const movieDetailsResponse = await fetchJson(`${api}cinemovie?url=${selectedMovie.link}&apikey=${prabathApi}`);

                if (!movieDetailsResponse || !movieDetailsResponse.data) {
                    return;
                }

                const desc = movieDetailsResponse.data;
                const qualities = desc.dllinks.directDownloadLinks;

                let movieTitle = desc.mainDetails.maintitle || "N/A";
                let imageUrl = desc.mainDetails.imageUrl;

                let qualityOptions = qualities.map((link, index) => `> ${index + 1}. ${link.quality} (${link.size})`).join("\n");

                let detailMessage = `
🌟 *Movie Details* 🌟
=========================
*Title:* ${movieTitle}

*Available Qualities:* 
=========================
${qualityOptions}
`;

                await conn.sendMessage(from, {
                    image: { url: imageUrl },
                    caption: detailMessage,
                    footer: "Powered by Cinesubz"
                }, { quoted: mek });

                // Listen for quality selection
                const qualityMessageID = sentMsg.key.id; // Use the original message ID to track quality selection
                conn.ev.on('messages.upsert', async (messageUpdate2) => {
                    const mek2 = messageUpdate2.messages[0];
                    if (!mek2.message) return;

                    const qualityResponse = mek2.message.conversation || mek2.message.extendedTextMessage?.text;
                    const userSelectedQuality = parseInt(qualityResponse);

                    const isReplyToQualityMsg = mek2.message.extendedTextMessage && mek2.message.extendedTextMessage.contextInfo.stanzaId === qualityMessageID;

                    // If user selects a valid quality number
                    if (isReplyToQualityMsg && userSelectedQuality && userSelectedQuality <= qualities.length) {
                        const selectedQuality = qualities[userSelectedQuality - 1];

                        // Fetch download link
                        const downloadResponse = await fetchJson(`${api}cinedownload?url=${selectedQuality.link}&apikey=${prabathApi}`);

                        if (!downloadResponse || !downloadResponse.data || !downloadResponse.data.direct) {
                            return;
                        }

                        // Send the movie document
                        await conn.sendMessage(from, {
                            document: { url: downloadResponse.data.direct },
                            mimetype: downloadResponse.data.mimeType,
                            fileName: downloadResponse.data.fileName,
                            caption: `Your movie "${movieTitle}" in ${selectedQuality.quality} is ready!`
                        }, { quoted: mek2 });
                    }
                });
            }
        });
    } catch (e) {
        console.log("Error: ", e.message);
        return await conn.sendMessage(from, { text: `An error occurred: ${e.message}` }, { quoted: mek });
    }
});
