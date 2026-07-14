// Vercel serverless entrypoint. Vercel's Node runtime can directly invoke an
// Express app (it behaves like a (req, res) handler), so we just re-export it.
module.exports = require('../app');
