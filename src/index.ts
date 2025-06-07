import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { randomBytes } from "crypto";
import Wetrocloud from "wetro-sdk";
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
	
	wetrocloudClient = new Wetrocloud({
		apiKey: MyMCP.apiKey || ""
	  });


	async init() {
		// Tool to convert a youtube url to markdown
		this.server.tool(
			"Wetrocloud_Youtube_Analyzer",
			{
				question: z.string(),
				youtubeUrl: z.string().url(),
			},
			async ({ question, youtubeUrl }) => {

				// Create collection
				let collectionId : string = randomBytes(16).toString("hex");

				// Create a collection (id is optional)
				await this.wetrocloudClient.createCollection({
					collection_id: collectionId
				  });

				// Insert a youtube resource
				await this.wetrocloudClient.insertResource({
					collection_id: collectionId,
					resource: youtubeUrl,
					type: "youtube"
					});

				// Query the collection
				const response : any = await this.wetrocloudClient.queryCollection({
					collection_id: collectionId,
					request_query: question
				  });

				// Return the response
				return {
					content: [
						{
							type: "text",
							text: response.response,
						}
					],
				};
			}
		);

	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		const apiKey = url.searchParams.get("apiKey") || "";
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
