using Aspire.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using System.IO;
using System;

// Set environment variables to allow unsecured transport for development
Environment.SetEnvironmentVariable("ASPIRE_ALLOW_UNSECURED_TRANSPORT", "true");
Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");
Environment.SetEnvironmentVariable("DOTNET_SYSTEM_NET_HTTP_SOCKETSHTTPHANDLER_HTTP2UNENCRYPTEDSUPPORT", "true");
Environment.SetEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED", "0");
Environment.SetEnvironmentVariable("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc"); // Default to gRPC
Environment.SetEnvironmentVariable("OTEL_EXPORTER_OTLP_INSECURE", "true"); // For development only
Environment.SetEnvironmentVariable("DOTNET_ASPIRE_DASHBOARD_OTLP_GRPC_ENABLED", "true"); // Enable gRPC

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
    .WithEnvironment("OTEL_SERVICE_NAME", "fortuneapi")
    // Configure OpenTelemetry for both HTTP and gRPC endpoints
    .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:4317") // gRPC endpoint
    .WithEnvironment("OTEL_EXPORTER_OTLP_HTTP_ENDPOINT", "http://127.0.0.1:18890") // HTTP endpoint
    .WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc") // Try gRPC first, fallback to HTTP/protobuf
    .WithEnvironment("OTEL_LOG_LEVEL", "debug")
    .WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0") 
    .WithEnvironment("ASPIRE_ALLOW_UNSECURED_TRANSPORT", "true")
    .WithEnvironment("OTEL_EXPORTER_OTLP_INSECURE", "true") // Allow insecure connections for development
    .WithOtlpExporter();

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
    .WithEnvironment("OTEL_SERVICE_NAME", "fortunespa")
    // Configure OpenTelemetry for both HTTP and gRPC endpoints
    .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:4317") // gRPC endpoint
    .WithEnvironment("OTEL_EXPORTER_OTLP_HTTP_ENDPOINT", "http://127.0.0.1:18890") // HTTP endpoint
    .WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc") // Try gRPC first, fallback to HTTP/protobuf  
    .WithEnvironment("OTEL_LOG_LEVEL", "debug")
    .WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0") 
    .WithEnvironment("ASPIRE_ALLOW_UNSECURED_TRANSPORT", "true")
    .WithEnvironment("OTEL_EXPORTER_OTLP_INSECURE", "true") // Allow insecure connections for development
    .WithOtlpExporter()
    .WithReference(fortuneApi);

// Log that we're building the application
var logger = builder.Services.BuildServiceProvider().GetRequiredService<ILogger<Program>>();
logger.LogInformation("Building Aspire application with Node.js services");

builder.Build().Run();






