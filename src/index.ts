import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
require('dotenv').config()

// Define our MCP agent with tools
export class MyMCP extends McpAgent {

	server = new McpServer({
		name: "Wetrocloud MCP",
		version: "1.0.0",
	});

	static apiKey: string | null = null;

	static setApiKey(apiKey: string | null) {
		MyMCP.apiKey = apiKey;
	}
	


	async init() {
		
		// Tool to convert a website to markdown
		this.server.tool(
			"WebsiteToMarkdown",
			{
				link: z.string().url(),
				resourceType: z.enum(["web", "pdf"]),
			},
			async ({ link, resourceType }) => {
				const res = await fetch("https://api.wetrocloud.com/v2/markdown-converter/", {
					method: "POST",
					headers: {
						Authorization: `Token ${MyMCP.apiKey}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						link,
						resource_type: resourceType || "web",
					}),
				});

				if (!res.ok) {
					return {
						content: [
							{
								type: "text",
								text: "Failed to convert to markdown",
							},
						],
					};
				}

				const markdown :any = await res.json();
				console.log(markdown.response)
				return {
					content: [
					  {
						type: "text",
						text: markdown.response, // Just return the markdown as text
					  },
					],
				  };
			}
		);

	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		const apiKey = url.searchParams.get("apiKey");
		MyMCP.setApiKey(apiKey);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
