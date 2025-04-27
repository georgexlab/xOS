import { server } from './server';

// Use port 5000 for Replit
const port = 5000; 
const host = '0.0.0.0';

const start = async () => {
  try {
    await server.listen({ port: Number(port), host });
    console.log(`Server listening on ${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
