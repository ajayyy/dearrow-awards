import express from 'express';
import http from 'http';
import { open } from 'sqlite'
import sqlite3 from 'sqlite3';
import { Mutex } from 'async-mutex';
import EloRank from 'elo-rank';
import path from 'path';
const __dirname = path.resolve();

const elo = new EloRank(15);

const mutex = new Mutex();
const app = express().use(express.json());
const db = await open({
    filename: './data/database.db',
    driver: sqlite3.Database
});

// Create an HTTP service.
http.createServer(app).listen(3001);

//add the public files
app.get('/', (_, res) => {
    return res.sendFile("index.html", { root: __dirname });
});

app.use("/images", express.static("data/images"))

const items = (await (await db.prepare("select count(*) as count from scores")).get()).count;

//success and failed
app.post('/vote', async (req, res) => {
    const { supporting, against } = req.body ?? {};

    if (supporting && against) {
        const release = await mutex.acquire();
        try {
            const score1 = (await (await db.prepare("select score from scores where id = ?", supporting)).get())?.score;
            const score2 = (await (await db.prepare("select score from scores where id = ?", against)).get())?.score;

            if (score1 != null && score2 != null) {
                const newScore1 = elo.updateRating(elo.getExpected(score1, score2), 1, score1);
                const newScore2 = elo.updateRating(elo.getExpected(score2, score1), 0, score2);

                await (await db.prepare("update scores set score = ? where id = ?", newScore1, supporting)).run();
                await (await db.prepare("update scores set score = ? where id = ?", newScore2, against)).run();
            }
        } finally {
            release();
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(400);
    }
});

app.get('/find', async (req, res) => {
    res.json(await generateChoicesWithAnImage());
});

async function generateChoicesWithAnImage() {
    let choices = await generateChoices();
    while (choices.choice1.attachments.length === 0 && choices.choice2.attachments.length === 0) {
        choices = await generateChoices();
    }

    return choices;
}

async function generateChoices() {
    const randomChoice1 = Math.floor(Math.random() * items);
    let randomChoice2 = Math.floor(Math.random() * items);
    while (randomChoice1 === randomChoice2) {
        randomChoice2 = Math.floor(Math.random() * items);
    }

    const choice1 = (await (await db.prepare("select * from scores limit 1 offset ?", randomChoice1)).get());
    const choice2 = (await (await db.prepare("select * from scores limit 1 offset ?", randomChoice2)).get());

    choice1.attachments = JSON.parse(choice1.attachments);
    choice2.attachments = JSON.parse(choice2.attachments);

    if (Math.random() > 0.5) {
        return { choice1, choice2 };
    } else {
        return { choice2, choice1 };
    }
}