const { cmd } = require('../command');
const config = require('../config');
const { fetchJson } = require('../lib/functions');
const prabathApi = "6467ad0b29"; // API key || 2 month
const api = "https://prabath-md-api.up.railway.app/api/"; // Base API link

// Command to fetch APK details
cmd({
    pattern: "apk",
    desc: "Fetch detailed information about an APK and download it.",
    category: "download",
    react: "🗃️",
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {    
        if (!q) {
            return reply("🗃️ Please provide the name of the APK.");
        }

        let data = await fetchJson(`${api}apksearch?q=${q}&apikey=${prabathApi}`);
        
        // Check if any APKs were found
        if (!data.data || data.data.length === 0) {
            return reply("❌ No APKs found for your search.");
        }

        // Get the first APK details
        const firstApp = data.data[0];

        // Set default values for properties
        const name = firstApp.name || "Unknown App";
        const packageName = firstApp.package || "Unknown Package";
        const lastUpdate = firstApp.lastup || "Unknown Date";
        const size = firstApp.size || "Unknown Size";
        const icon = firstApp.icon || "https://via.placeholder.com/150"; // Placeholder for missing icon
        const downloadLink = firstApp.dllink || "";

        // If download link is missing, inform the user
        if (!downloadLink) {
            return reply("❌ Download link is missing for this APK.");
        }

        const desc = `*Name:* ${name}\n*Developer:* ${packageName}\n*Last Update:* ${lastUpdate}\n*Size:* ${size} MB`;
        
        // Send APK details with image       
        await conn.sendMessage(from, { image: { url: icon }, caption: desc }, { quoted: mek });

        // Ask user to reply with "1" to download the APK
        const sentMsg = await conn.sendMessage(from, { text: "Reply with *1* to download this APK." }, { quoted: mek });
        const messageID = sentMsg.key.id; // Save the message ID for later reference

        // Listen for the user's response
        conn.ev.on('messages.upsert', async (messageUpdate) => {
            const mek = messageUpdate.messages[0];
            if (!mek.message) return;

            const messageType = mek.message.conversation || mek.message.extendedTextMessage?.text;
            const from = mek.key.remoteJid;
            const sender = mek.key.participant || mek.key.remoteJid;

            // Check if the message is a reply to the previously sent message
            const isReplyToSentMsg = mek.message.extendedTextMessage && mek.message.extendedTextMessage.contextInfo.stanzaId === messageID;
            if (isReplyToSentMsg && messageType === "1") {
                // Send APK download link
                const sendapk = await conn.sendMessage(from, { document: { url: downloadLink }, mimetype: 'application/vnd.android.package-archive', fileName: name + '.apk', caption: "> Qᴜᴇᴇɴ-ᴢᴀᴢɪᴇ-ᴍᴅ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴʙᴛ" }, { quoted: mek });
                return await conn.sendMessage(from, { react: { text: '🗃️', key: sendapk.key } });
            }
        });
    } catch (e) {
        console.log(e);
        return reply("❌ An error occurred. Please try again later.");
    }
});
