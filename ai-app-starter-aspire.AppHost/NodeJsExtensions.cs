using Aspire.Hosting;
using System;
using System.Linq;
using System.Diagnostics;

namespace Aspire.Extensions.NodeJs
{
    public static class NodeJsExtensions
    {
        /// <summary>
        /// Adds telemetry support to a Node.js application
        /// </summary>
        public static IResourceBuilder<NodeAppResource> WithNodeTelemetry(this IResourceBuilder<NodeAppResource> builder, string serviceName)
        {            // Try to find the correct OTLP endpoint
            // First, check if the environment variable is set
            string? otlpEndpoint = Environment.GetEnvironmentVariable("DOTNET_DASHBOARD_OTLP_ENDPOINT_URL");
            
            // If not set, try to use the one from the detected running Aspire dashboard
            if (string.IsNullOrEmpty(otlpEndpoint))
            {
                // Try to find Aspire processes
                try
                {
                    Process? process = Process.GetProcessesByName("Aspire.Dashboard").FirstOrDefault();
                    if (process != null)
                    {
                        Console.WriteLine($"Found Aspire Dashboard process (PID: {process.Id})");
                        
                        // Based on typical Aspire patterns, the OTLP endpoint is often on dashboard port + 1000
                        // or at port 21035 based on your environment
                        otlpEndpoint = "http://localhost:21035";
                        Console.WriteLine($"Using detected Aspire OTLP endpoint: {otlpEndpoint}");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error detecting Aspire Dashboard process: {ex.Message}");
                }
                
                // Fallback to default if still not set
                if (string.IsNullOrEmpty(otlpEndpoint))
                {
                    otlpEndpoint = "http://localhost:4317";
                }
            }
            
            Console.WriteLine($"Configuring Node.js telemetry for {serviceName} with OTLP endpoint: {otlpEndpoint}");
            
            return builder
                // Set OTLP endpoint environment variables - the key configuration                
                .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", otlpEndpoint)
                
                // SSL/TLS configuration - needed for self-signed certificates
                .WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0") // Ignore certificate validation
                
                // Service identification
                .WithEnvironment("OTEL_SERVICE_NAME", serviceName)
                .WithEnvironment("OTEL_RESOURCE_ATTRIBUTES", $"service.name={serviceName},service.namespace=aspire,deployment.environment=development")
                
                // Protocol configuration - must be http/protobuf for Aspire
                .WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")
                .WithEnvironment("OTEL_TRACES_EXPORTER", "otlp")
                .WithEnvironment("OTEL_METRICS_EXPORTER", "otlp")
                .WithEnvironment("OTEL_LOGS_EXPORTER", "otlp")
                
                // Sampling and propagation
                .WithEnvironment("OTEL_PROPAGATORS", "tracecontext,baggage")
                .WithEnvironment("OTEL_TRACES_SAMPLER", "always_on")
                .WithEnvironment("OTEL_TRACES_SAMPLER_ARG", "1.0")
                
                // Debug settings
                .WithEnvironment("OTEL_DEBUG", "true"); 
        }
    }
}
