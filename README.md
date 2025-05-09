# Fortune Application with .NET Aspire

This project demonstrates how to use .NET Aspire to orchestrate Node.js applications in a distributed application architecture.

## Structure

- **NodeFortuneApi**: An Express.js API that serves random fortunes from a SQLite database
- **NodeFortuneSpa**: A React/Vite SPA that consumes the API and displays fortunes
- **aspire-nodejs-launcher**: Helper scripts for launching Node.js apps from .NET Aspire
- **ai-app-starter-aspire.AppHost**: The .NET Aspire orchestration project

## Documentation

- [Node.js + .NET Aspire Integration Guide](NODE_ASPIRE_INTEGRATION.md) - Detailed explanation of the integration
- [OpenTelemetry Integration Guide](OPENTELEMETRY.md) - How OpenTelemetry is integrated with Aspire
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Solutions for common issues

## Prerequisites

- .NET 8 SDK (includes .NET Aspire)
- Node.js 20 LTS

## Getting Started

### Setup Dependencies

First, install all Node.js dependencies:

```powershell
# Install all dependencies
npm run bootstrap
```

### Running with Aspire Dashboard (Recommended)

```powershell
# Run with Aspire
cd ai-app-starter-aspire.AppHost
dotnet run
```

This will:

1. Start the Aspire dashboard
2. Launch the Express.js API at `http://localhost:4000`
3. Launch the React SPA at `http://localhost:3000`

## How It Works

### Node.js Integration with Aspire

The AppHost (`ai-app-starter-aspire.AppHost/Program.cs`) is configured to:

1. Register the Node.js API as a service
2. Register the React SPA as a service
3. Configure service-to-service communication

```csharp
// Add the Node.js API backend
var fortuneApi = builder.AddNpmApp("fortuneapi", apiPath, "start")
    .WithHttpEndpoint(targetPort: 4000)
    .WithEnvironment("PORT", "4000")
    .WithEnvironment("NODE_ENV", builder.Environment.IsDevelopment() ? "development" : "production");

// Add the React frontend
var fortuneSpa = builder.AddNpmApp("fortunespa", spaPath, "start")
    .WithHttpEndpoint(targetPort: 3000)
    .WithEnvironment("PORT", "3000")
    .WithEnvironment("BROWSER", "none")
    .WithEnvironment("services__fortuneapi__http", fortuneApi.GetEndpoint("http"))
    .WithReference(fortuneApi);
```

### Service-to-Service Communication

Aspire handles service discovery by injecting environment variables. The React SPA accesses the API using the `services__fortuneapi__http` environment variable:

```typescript
// In NodeFortuneSpa/vite.config.ts
const apiUrl = process.env.services__fortuneapi__http || 'http://localhost:4000';
```

## Troubleshooting

### Common Issues

1. **Path Resolution**: Ensure the AppHost can properly resolve the paths to your Node.js applications. The current configuration detects the running environment and adjusts paths accordingly.

2. **Port Configuration**: Make sure the Node.js applications are configured to use the `PORT` environment variable passed by Aspire.

3. **Service Communication**: If the SPA can't connect to the API, check that the proxy configuration in `vite.config.ts` is correctly using the service reference.

4. **Database Setup**: The API requires a SQLite database. The launcher script ensures the database is set up before starting the API.

### Debugging

The `aspire-nodejs-launcher` directory contains helpful debugging tools:

- `debug-env.js`: Prints all environment variables for debugging
- `ensure-db.js`: Ensures the database exists and is properly initialized

You can also check the Aspire dashboard for logs and service status.

```csharp
// Add the Node.js API backend using AddNpmApp
var fortuneApi = builder.AddNpmApp("fortuneapi", "../NodeFortuneApi", "start")
    .WithHttpEndpoint(port: 4000, name: "http")
    .WithEnvironment("NODE_ENV", builder.Environment.IsDevelopment() ? "development" : "production")
    .PublishAsDockerFile();

// Add the React frontend using AddNpmApp
var fortuneSpa = builder.AddNpmApp("fortunespa", "../NodeFortuneSpa", "start")
    .WithHttpEndpoint(port: 3000, name: "http")
    .WithReference(fortuneApi)
    .WithEnvironment("NODE_ENV", builder.Environment.IsDevelopment() ? "development" : "production")
    .WithEnvironment("BROWSER", "none") // Prevent browser from opening automatically
    .PublishAsDockerFile();
```

### Service Communication

- Aspire handles service discovery by setting environment variables
- The environment variable pattern is: `services__<serviceName>__<endpointName>`
- The React SPA's Vite server proxies API requests to the backend
- API requests are made to `/api/fortunes/random` in the React app

### Development Workflow

For normal development, using Aspire is recommended. However, you can also run the applications directly:

#### API Development

```powershell
cd NodeFortuneApi
npm run dev
```

#### SPA Development

```powershell
cd NodeFortuneSpa
npm run dev
```

### Production Build

To build both applications for production:

```powershell
npm run build
```

## Troubleshooting

If you encounter issues with the Node.js applications not starting:

1. **Check Aspire AppHost Configuration:**
   - Make sure the `AddNpmApp` calls use the correct syntax with absolute paths
   - Use `WithHttpEndpoint` with `targetPort` parameter for proper endpoint configuration
   - Always include environment variables for PORT explicitly

2. **Database Issues:**
   - Ensure the SQLite database is created and seeded: `cd NodeFortuneApi && npm run setup-db`
   - Check file permissions for the database file

3. **Environment Variables:**
   - Use the environment debugger: `cd aspire-nodejs-launcher && node debug-env.js`
   - Verify that Aspire is correctly passing service bindings

4. **Common Solutions:**
   - Update paths in `AppHost/Program.cs` to use absolute paths
   - Set explicit port numbers in both Aspire config and Node.js applications
   - Check for errors in the Aspire dashboard logs

### Path Resolution Issue

If you encounter a path resolution issue, update your AppHost's Program.cs to include this code for reliable path resolution:

```csharp
// Get the path to the solution directory
// Try to determine the solution directory from the current directory
string solutionDir;
string currentDir = Directory.GetCurrentDirectory();

// During development, the current directory is usually the project directory
// We need to go up to the solution directory
if (currentDir.EndsWith("ai-app-starter-aspire.AppHost"))
{
    // We're in the project directory, go up one level
    solutionDir = Path.GetFullPath(Path.Combine(currentDir, ".."));
    Console.WriteLine($"Path resolved from project directory: {solutionDir}");
}
else if (currentDir.Contains("ai-app-starter-aspire.AppHost\\bin"))
{
    // We're in the output directory, go up multiple levels
    solutionDir = Path.GetFullPath(Path.Combine(currentDir, "..", "..", ".."));
    Console.WriteLine($"Path resolved from bin directory: {solutionDir}");
}
else
{
    // Use the current directory as fallback
    solutionDir = currentDir;
    Console.WriteLine($"Using current directory as solution dir: {solutionDir}");
}
```

If you encounter issues with the Node.js applications not starting:

1. Ensure all dependencies are installed: `npm run bootstrap`
2. Check that the database setup is complete: `npm run setup-db`
3. Verify environment variables are correctly passed from Aspire to the applications
4. Check the Aspire dashboard for detailed logs

## Aspire Configuration

### AppHost Configuration

The AppHost (`ai-app-starter-aspire.AppHost/Program.cs`) is configured to:

1. Register the Node.js API as a containerized service
2. Register the React frontend as a service
3. Configure service-to-service communication

```csharp
// Add the Node.js API backend
var fortuneApi = builder.AddNodeApp("fortuneapi", "NodeFortuneApi")
    .WithEndpoint(name: "http", port: 4000)
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

// Add the React frontend
var fortuneSpa = builder.AddNodeApp("fortunespa", "NodeFortuneSpa")
    .WithEndpoint(name: "http", port: 3000)
    .WithEnvironment("services__fortuneapi__http", fortuneApi.GetEndpoint("http"))
    .WithReference(fortuneApi)
    .WithExternalHttpEndpoints();
```

### Environment Variables

Aspire handles service discovery by injecting environment variables that follow a specific naming pattern:

- `services__<serviceName>__<endpointName>`

For example, the React SPA can access the API URL through:
- `services__fortuneapi__http`

### Service Communication

- The React app communicates with the API through the Vite dev server proxy
- Aspire handles environment variables for service discovery automatically
- In the React app, API calls are made to `/api/fortunes/random` which is proxied to the backend

### Development vs Production

- **Development**: Uses Vite's development server with API proxy
- **Production**: Container images are built and services communicate via Aspire's network configuration

## Aspire Configuration

### AppHost Configuration

The AppHost (`ai-app-starter-aspire.AppHost/Program.cs`) is configured to:

1. Register the Node.js API as a containerized service
2. Register the React frontend as a service
3. Configure service-to-service communication

```csharp
// Add the Node.js API backend
var fortuneApi = builder.AddNodeApp("fortuneapi", "NodeFortuneApi")
    .WithEndpoint(name: "http", port: 4000)
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

// Add the React frontend
var fortuneSpa = builder.AddNodeApp("fortunespa", "NodeFortuneSpa")
    .WithEndpoint(name: "http", port: 3000)
    .WithEnvironment("services__fortuneapi__http", fortuneApi.GetEndpoint("http"))
    .WithReference(fortuneApi)
    .WithExternalHttpEndpoints();
```

### Service Communication

- The React app communicates with the API through the Vite dev server proxy
- Aspire handles environment variables for service discovery automatically
- In the React app, API calls are made to `/api/fortunes/random` which is proxied to the backend

### Development vs Production

- **Development**: Uses Vite's development server with API proxy
- **Production**: Container images are built and services communicate via Aspire's networking

## Aspire Configuration

### AppHost Configuration

The AppHost (`ai-app-starter-aspire.AppHost/Program.cs`) is configured to:

1. Register the Node.js API as a containerized service
2. Register the React frontend as a service
3. Configure service-to-service communication

```csharp
// Add the Node.js API backend
var fortuneApi = builder.AddNodeApp("fortuneapi", "NodeFortuneApi")
    .WithEndpoint(name: "http", port: 4000)
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

// Add the React frontend
var fortuneSpa = builder.AddNodeApp("fortunespa", "NodeFortuneSpa")
    .WithEndpoint(name: "http", port: 3000)
    .WithEnvironment("services__fortuneapi__http", fortuneApi.GetEndpoint("http"))
    .WithReference(fortuneApi)
    .WithExternalHttpEndpoints();
```

### Service Communication

- The React app communicates with the API through the Vite dev server proxy
- Aspire handles environment variables for service discovery automatically
- In the React app, API calls are made to `/api/fortunes/random` which is proxied to the backend

### Development vs Production

- **Development**: Uses Vite's development server with API proxy
- **Production**: Container images are built and services communicate via Aspire's networking
4. Set up proper service discovery between the applications

### Option 2: Running Node Applications Directly

```powershell
# Install dependencies
npm run bootstrap

# Setup the database
cd NodeFortuneApi
npm run setup-db
cd ..

# Run the API
cd NodeFortuneApi
npm run dev
# (In a new terminal)

# Run the SPA
cd NodeFortuneSpa
npm run dev
```

## Development

### API Development

```powershell
cd NodeFortuneApi
npm run dev
```

### SPA Development

```powershell
cd NodeFortuneSpa
npm run dev
```

## Production Build

```powershell
npm run build
```

## Features

- Random fortune generation from SQLite database
- Service orchestration with .NET Aspire
- Containerization support with Docker

## Troubleshooting

### Common Issues with Aspire Integration

1. **Path Resolution**: If Aspire cannot find your Node.js applications, check the path resolution in `Program.cs`. Make sure it correctly resolves the paths to your Node.js projects.

2. **Port Configuration**: Ensure that the Node.js applications use the `PORT` environment variable:
   ```typescript
   // Use environment variable for port, which will be set by Aspire
   const PORT = parseInt(process.env.PORT || '4000', 10);
   ```

3. **Service Communication**: If the SPA cannot connect to the API, verify that the proxy configuration in `vite.config.ts` is correctly using the service reference:
   ```typescript
   const apiUrl = process.env.services__fortuneapi__http || 'http://localhost:4000';
   ```

4. **Endpoint Configuration**: Make sure the Aspire configuration uses `WithHttpEndpoint` with the correct `targetPort` parameter:
   ```csharp
   .WithHttpEndpoint(targetPort: 4000)
   ```

### Debugging Tips

- Check the Aspire dashboard for service logs and status
- Use the `debug-env.js` script in the `aspire-nodejs-launcher` directory to verify environment variables
- Try running each Node.js application directly to ensure they work independently

For more detailed troubleshooting information, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
