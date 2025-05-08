# Node.js + .NET Aspire Integration Guide

This document explains how we integrated Node.js applications with .NET Aspire in this project.

## Overview

This project demonstrates how to use .NET Aspire to orchestrate both .NET services and Node.js applications. The integration includes:

1. A .NET Aspire AppHost project that orchestrates all services
2. A Node.js Fortune API (NodeFortuneApi) built with Express and TypeScript
3. A React SPA (NodeFortuneSpa) built with Vite and TypeScript
4. Custom Node.js launcher scripts to handle the integration

## How It Works

### Architecture

```
┌─────────────────────────────────┐
│         Aspire AppHost          │
│                                 │
│  ┌───────────┐    ┌───────────┐ │
│  │   .NET    │    │   .NET    │ │
│  │ Services  │    │    Web    │ │
│  └───────────┘    └───────────┘ │
│                                 │
│  ┌───────────┐    ┌───────────┐ │
│  │  Node.js  │    │  React    │ │
│  │    API    │    │    SPA    │ │
│  └───────────┘    └───────────┘ │
└─────────────────────────────────┘
```

### Key Components

1. **AppHost Program.cs**: Configures and launches all services including Node.js apps
2. **Node.js Launcher Scripts**: Handle the execution of Node.js applications from Aspire
3. **Environment Variable Passthrough**: Ensures service discovery works between all components

## Implementation Details

### AppHost Configuration

In the AppHost's `Program.cs`, we configure Node.js applications using the `AddNpmApp` extension method:

```csharp
// Add the Node.js API backend
var fortuneApi = builder.AddNpmApp("fortuneapi", apiPath, "start")
    .WithHttpEndpoint(port: 4000)
    .WithEnvironment("PORT", "4000")
    .WithEnvironment("NODE_ENV", builder.Environment.IsDevelopment() ? "development" : "production");

// Add the React frontend
var fortuneSpa = builder.AddNpmApp("fortunespa", spaPath, "start")
    .WithHttpEndpoint(port: 3000)
    .WithEnvironment("PORT", "3000")
    .WithEnvironment("BROWSER", "none")
    .WithEnvironment("services__fortuneapi__http", fortuneApi.GetEndpoint("http"))
    .WithReference(fortuneApi);
```

Key points:
- `AddNpmApp` takes the service name, path to the Node.js app, and the npm script to run
- `WithHttpEndpoint` configures the port for the service
- `WithEnvironment` passes environment variables to the Node.js process
- `WithReference` establishes dependencies between services

### Node.js Launcher

The launcher script in `aspire-nodejs-launcher/launch.js` handles:

1. Resolving the full project path
2. Checking if package.json exists
3. Ensuring any database setup is performed (for the API)
4. Starting the Node.js application with all environment variables

### Service Discovery

Aspire provides service discovery through environment variables:

- `services__fortuneapi__http` contains the URL of the Fortune API service
- The React SPA uses this environment variable to connect to the API

## Best Practices

1. **Absolute Paths**: Always use absolute paths when configuring Node.js apps in Aspire
2. **Environment Variables**: Pass all necessary environment variables explicitly
3. **Health Endpoints**: Implement health check endpoints in your Node.js applications
4. **Port Configuration**: Ensure ports are consistent between Aspire configuration and the Node.js apps
5. **Database Initialization**: Handle database setup before starting your applications

## Troubleshooting

See the [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) file for common issues and their solutions.
