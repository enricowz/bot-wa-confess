const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');
const moment = require('moment');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const conn = makeWASocket({ auth: state });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log('✅ Bot berhasil terhubung!');
        } else if (connection === 'close') {
            console.log('⚠️ Koneksi terputus, mencoba menghubungkan ulang...');
            startBot();
        }
    });

    conn.ev.on('messages.upsert', async (msg) => {
        const chat = msg.messages[0];
        if (!chat.message) return;
        const sender = chat.key.remoteJid;
        const messageContent = chat.message.conversation;

        if (messageContent) {
            if (messageContent.startsWith('.send')) {
                const args = messageContent.split(' ');
                if (args.length < 3) return;
                const target = args[1] + '@s.whatsapp.net';
                const text = args.slice(2).join(' ');
                await conn.sendMessage(target, { text });
                await conn.sendMessage(sender, { text: '✅ Pesan terkirim!' });
            }

            if (messageContent.startsWith('.bot')) {
                const user = await conn.profilePictureUrl(sender, 'image').catch(() => null);
                const uptime = moment.duration(process.uptime(), 'seconds').humanize();
                const timeNow = moment().format('HH:mm:ss');
                const dateNow = moment().format('DD-MM-YYYY');
                const caption = `Hai! Saya adalah bot WhatsApp.\n\n📅 Tanggal: ${dateNow}\n⏰ Waktu: ${timeNow}\n⏳ Uptime: ${uptime}`;
                
                if (user) {
                    await conn.sendMessage(sender, { image: { url: user }, caption });
                } else {
                    await conn.sendMessage(sender, { text: caption });
                }
            }
        }
    });

    return conn;
}

startBot().catch(console.error);
