# Troubleshooting .NET Aspire and Node.js Integration

This document provides solutions to common issues when integrating Node.js applications with .NET Aspire.

## Common Issues and Solutions

### 1. Path Resolution Issues

If Aspire cannot find your Node.js applications, check the path resolution in `Program.cs`. Make sure it correctly resolves the paths to your Node.js projects.

```csharp
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
```

### 2. HTTP Endpoint Configuration

Use `WithHttpEndpoint` with the proper parameters:

```csharp
var fortuneApi = builder.AddNpmApp("fortuneapi", apiPath, "start")
    .WithHttpEndpoint(targetPort: 4000)
    .WithEnvironment("PORT", "4000");
```

### 3. Service Discovery Issues

Make sure you're correctly passing the service reference:

```csharp
var fortuneSpa = builder.AddNpmApp("fortunespa", spaPath, "start")
    .WithHttpEndpoint(targetPort: 3000)
    .WithEnvironment("services__fortuneapi__http", fortuneApi.GetEndpoint("http"))
    .WithReference(fortuneApi);
```

### 4. Environment Variables

On the Node.js side, make sure you're properly reading the environment variables provided by Aspire:

```javascript
// Get API URL from Aspire environment variables, fallback to localhost
const apiUrl = process.env.services__fortuneapi__http || 'http://localhost:4000';
console.log(`API URL from environment: ${apiUrl}`);
```

### 5. Debugging Environment Variables

Use the debug-env.js script in the aspire-nodejs-launcher directory to see all environment variables:

```bash
node aspire-nodejs-launcher/debug-env.js
```

### 6. Node.js Port Configuration

Make sure your Node.js application is properly configured to use the PORT environment variable:

```typescript
// Use environment variable for port, which will be set by Aspire
const PORT = parseInt(process.env.PORT || '4000', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🪄 Server listening at http://0.0.0.0:${PORT}`);
});
```

## Additional Resources

- [.NET Aspire Documentation](https://learn.microsoft.com/en-us/dotnet/aspire/)
- [Node.js with .NET Aspire](https://learn.microsoft.com/en-us/dotnet/aspire/deploying/node-js)
