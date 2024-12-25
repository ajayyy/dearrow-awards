import { open } from 'sqlite'
import sqlite3 from 'sqlite3';
import EloRank from 'elo-rank';
import fs from 'fs';

const elo = new EloRank(15);

async function init() {
    const db = await open({
        filename: './data/database.db',
        driver: sqlite3.Database
    });
    
    const data = JSON.parse(await fs.promises.readFile('./data/messages.json'));
    
    for (const message of data.messages) {
        const id = message.id;
        const content = message.content;
        const attachments = message.attachments.map(attachment =>
            attachment.url.replace("SponsorBlock - offtopic - dearrow-awards [1132080013521453088].json_Files", "images"));
    
        const author = message.author.nickname;
        const username = message.author.name;

        const statement = await db.prepare("insert into scores (id, score, content, attachments, author, username) values (?, ?, ?, ?, ?, ?)", id, 1000, content, JSON.stringify(attachments), author, username);
        await statement.run();
    }
    
    await db.close;
}

init();