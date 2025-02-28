import { NextRequest, NextResponse } from "next/server";
import { CohereClient } from "cohere-ai";

interface RequestBody {
  text: string;
}

// Validate environment variable
const COHERE_API_KEY = process.env.COHERE_API_KEY;
if (!COHERE_API_KEY) {
  throw new Error("COHERE_API_KEY is not set in the environment variables");
}

// Initialize Cohere client
const cohere = new CohereClient({
  token: COHERE_API_KEY,
});

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text } = body;
  if (!text || typeof text !== "string" || text.trim() === "") {
    return NextResponse.json(
      { error: "Text is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  try {
    const response = await cohere.v2.embed({
      texts: [text],
      model: "embed-english-v3.0",
      inputType: "classification",
      embeddingTypes: ["float"],
      truncate: "END",
    });

    // Check if embeddings are present
    if (!response.embeddings?.float || response.embeddings.float.length === 0) {
      throw new Error("No embeddings returned from Cohere v2 API");
    }

    const vector = response.embeddings.float[0]; // First text’s float embedding
    // console.log(vector);
    return NextResponse.json({ vector });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}