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
        const allApps = data.data.data.map((app, index) => {
            return `*${index + 1}.* ${app.name} - ID: ${app.id}\n`;
        });

        const message = '*APK SEARCH*\n____________________________\n\n' +
                        `*Searched Applications:*\n\n${allApps.join('')}` +
                        `\n_Reply with the number to download the APK._`;
        
        const sentMsg = await conn.sendMessage(from, { text: message }, { quoted: mek });
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
            if (isReplyToSentMsg) {
                const apkNumber = parseInt(messageType);
                if (isNaN(apkNumber) || apkNumber < 1 || apkNumber > allApps.length) {
                    return conn.sendMessage(from, { text: "🛑 Invalid number. Please reply with a valid number." }, { quoted: mek });
                }

                const selectedApp = data.data.data[apkNumber - 1];
                const desc = `*Name:* ${selectedApp.name}\n*Developer:* ${selectedApp.package}\n*Last Update:* ${selectedApp.lastup}\n*Size:* ${selectedApp.size} MB`;
                
                // Send details with image       
                await conn.sendMessage(from, { image: { url: selectedApp.icon }, caption: desc }, { quoted: mek });
                
                // Send APK download link
                const sendapk = await conn.sendMessage(from, { document: { url: selectedApp.dllink }, mimetype: 'application/vnd.android.package-archive', fileName: selectedApp.name + '.apk', caption: "> Qᴜᴇᴇɴ-ᴢᴀᴢɪᴇ-ᴍᴅ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴʙᴛ" }, { quoted: mek });
                return await conn.sendMessage(from, { react: { text: '🗃️', key: sendapk.key } });
            }
        });
    } catch (e) {
        console.log(e);
        return reply("❌ An error occurred. Please try again later.");
    }
});
