// Local development entrypoint: `npm run dev` runs this file.
// (When deployed to Vercel, api/index.js is used instead - see vercel.json.)
const app = require('./app');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
