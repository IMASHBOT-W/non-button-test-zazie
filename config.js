const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
// Put Your Session Id Here
SESSION_ID: process.env.SESSION_ID || "mTBjxAhI#4X2sPwEuMdUhSf-FgJom0slFNoq7f1OClYgsNI1UnqM",
OWNER_NUMBER: '94760059126@s.whatsapp.net',
ALIVE_IMG: process.env.ALIVE_IMG || "https://i.postimg.cc/xdhMJy1b/Screenshot-20240830-004711-Pixel-Lab.jpg",
ALIVE_MSG: process.env.ALIVE_IMG || "🤖🔰 Hi QUEEN-KYLIE-MD Is Online Now 💻\n*💻 Owner* - QUEEN-KYLIE-MD\n\n*💻 Owner Number* -94760059126\n\n_විධාන මෙනුව ලබා ගැනීමට .menu ලෙස ටයිප් කරන්න._",
//Add Your Own Sudo Number
SUDO_NB: process.env.SUDO_NB || "94760059126",
AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || "true",
//Edit Bot Mode Private Or Public
MODE: process.env.MODE || "public",
//Edit Auto Voice Send true Or false
AUTO_VOICE: "true",
ELEVENLABS_API_KEY: 'sk_4669df1ac80b92a39528954725c4ff916fbfc7e3a4d75b22',
// OMDB API Key
OMDB_API_KEY: 'd15d38e2'
};
