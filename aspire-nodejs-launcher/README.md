# Aspire Node.js Launcher

This directory contains helper scripts for launching Node.js applications from .NET Aspire.

## Scripts

- `launch.js` - Main script used by Aspire to launch Node.js applications
- `debug-env.js` - Utility script to debug environment variables 
- `ensure-db.js` - Ensures the SQLite database exists before starting the API

## How It Works

When Aspire launches a Node.js application, it:

1. Uses `AddNpmApp` to register the Node.js application in the AppHost
2. Sets up the necessary environment variables for service discovery
3. Calls the launcher script with parameters about the application to launch

The launcher script:
1. Resolves the full project path
2. Checks if the package.json exists
3. For the API, ensures the database is set up
4. Launches the npm script specified in the Aspire configuration
5. Forwards all environment variables from Aspire to the Node.js process

## Debugging

If you're having issues with Aspire launching your Node.js applications:

1. Run the debug-env.js script directly:
   ```
   node debug-env.js
   ```

2. Check the Aspire dashboard logs for any error messages

3. Try running the applications directly:
   ```
   cd ../NodeFortuneApi
   npm run dev
   ```
   
   ```
   cd ../NodeFortuneSpa
   npm run dev
   ```
