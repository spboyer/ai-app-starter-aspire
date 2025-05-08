import express from 'express';
import cors from 'cors';
import db from './db';

const app = express();
// Use environment variable for port, which will be set by Aspire
const PORT = parseInt(process.env.PORT || '4000', 10);

// Enable CORS for all origins in development
app.use(cors({
  // In production, you might want to restrict this to specific origins
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// API endpoint for random fortunes - both with /api prefix and without
// This allows direct access and access through the proxy
app.get('/api/fortunes/random', getRandomFortune);
app.get('/fortunes/random', getRandomFortune);

// Function to get a random fortune
async function getRandomFortune(_req: express.Request, res: express.Response) {
  try {
    // Get a random fortune from the database
    const fortune = await db<{ id: number; text: string }>('fortunes')
      .orderByRaw('RANDOM()')
      .first();
    if (!fortune) return res.status(404).json({ error: 'No fortunes found.' });
    res.json(fortune);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Handle requests to /api root path - needed for Aspire service discovery testing
app.get('/api', (_req, res) => {
  res.status(200).json({ message: 'Fortune API is running' });
});

// Health check endpoint for Aspire
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Root path for checking if the API is running
app.get('/', (_req, res) => {
  res.status(200).json({ 
    message: 'Fortune API is running',
    endpoints: {
      random: '/api/fortunes/random',
      health: '/health'
    }
  });
});

// Log all environment variables for debugging
console.log('Environment variables:');
Object.keys(process.env)
  .filter(key => !key.includes('SECRET') && !key.includes('KEY'))
  .forEach(key => console.log(`  ${key}=${process.env[key]}`));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🪄 Fortune API listening at http://0.0.0.0:${PORT}`);
  console.log(`Health check available at http://0.0.0.0:${PORT}/health`);
  console.log('All endpoints:');
  console.log(`  /api/fortunes/random - Get a random fortune (proxy friendly)`);
  console.log(`  /fortunes/random - Get a random fortune (direct access)`);
  console.log(`  /api - API information`);
  console.log(`  /health - Health check endpoint`);
  console.log(`  / - Root path information`);
  
  // Check for Aspire environment variables
  console.log('\nAspire service bindings:');
  const aspireVars = Object.keys(process.env).filter(key => key.startsWith('services__'));
  if (aspireVars.length > 0) {
    aspireVars.forEach(key => console.log(`  ${key}=${process.env[key]}`));
  } else {
    console.log('  No Aspire service bindings found');
  }
});
