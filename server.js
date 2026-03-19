import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/stats', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync('registrations.json', 'utf8') || '[]');
        res.json({ totalTeams: data.length });
    } catch {
        res.json({ totalTeams: 0 });
    }
});

app.post('/api/register', (req, res) => {
    const registration = req.body;
    const data = JSON.parse(fs.readFileSync('registrations.json', 'utf8') || '[]');
    data.push({ ...registration, id: Date.now() });
    fs.writeFileSync('registrations.json', JSON.stringify(data, null, 2));
    res.status(200).send({ message: "Registration successful!" });
});

app.listen(3001, () => {
    if (!fs.existsSync('registrations.json')) fs.writeFileSync('registrations.json', '[]');
    console.log('Backend running on http://localhost:3001');
});