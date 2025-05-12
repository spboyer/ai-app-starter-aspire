using Aspire.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using System.IO;
using System;
using Aspire.Extensions.NodeJs;

var builder = DistributedApplication.CreateBuilder(args);

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

// Add a logger to see diagnostic messages
builder.Services.AddLogging(logging => logging.AddConsole());

// Add the Node.js API backend using the correct syntax from the docs
// Provide the full absolute path to the project
var apiPath = Path.GetFullPath(Path.Combine(solutionDir, "NodeFortuneApi"));
Console.WriteLine($"API Path: {apiPath}");
var fortuneApi = builder.AddNpmApp("fortuneapi", apiPath, "start")
    .WithHttpEndpoint(targetPort: 4000, name: "http")
    .WithEnvironment("PORT", "4000")
    .WithEnvironment("NODE_ENV", builder.Environment.IsDevelopment() ? "development" : "production")
    .WithNodeTelemetry("fortune-api");

// Add the React frontend using the correct syntax from the docs
// Provide the full absolute path to the project
var spaPath = Path.GetFullPath(Path.Combine(solutionDir, "NodeFortuneSpa"));
Console.WriteLine($"SPA Path: {spaPath}");
var fortuneSpa = builder.AddNpmApp("fortunespa", spaPath, "start")
    .WithHttpEndpoint(targetPort: 3000, name: "http")
    .WithEnvironment("PORT", "3000")
    .WithEnvironment("BROWSER", "none")
    .WithEnvironment("services__fortuneapi__http", fortuneApi.GetEndpoint("http"))
    .WithEnvironment("NODE_ENV", builder.Environment.IsDevelopment() ? "development" : "production")
    .WithNodeTelemetry("fortune-spa")
    .WithReference(fortuneApi);

// Log that we're building the application
var logger = builder.Services.BuildServiceProvider().GetRequiredService<ILogger<Program>>();
logger.LogInformation("Building Aspire application with Node.js services");

builder.Build().Run();
