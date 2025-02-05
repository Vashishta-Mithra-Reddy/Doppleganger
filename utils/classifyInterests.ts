export const classifyInterests = async (interests: string[]) => {
    const apiKey = process.env.NEXT_PUBLIC_MISTRAL_API_KEY; // Store in .env.local
  
    if (!apiKey) {
      console.error("Mistral API key is missing");
      return [];
    }
  
    const prompt = `
    You are an AI system that categorizes user interests into broad predefined domains for a matching system.
    Given a list of user-provided interests, classify them into the most relevant domains from the following set:
    
    - Technology & Science
    - Arts & Creativity
    - Music & Entertainment
    - Sports & Fitness
    - Gaming & Esports
    - Literature & Writing
    - Business & Finance
    - Travel & Adventure
    - Food & Culinary Arts
    - Self-Improvement & Well-being
  
    If an interest does not fit any of these domains, classify it under 'Other.' 
    Ensure accurate classification based on common associations.
  
    Interests: ${interests.join(", ")}
  
    Provide the response as a JSON array of domain names only.
    `;
  
    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
          messages: [{ role: "user", content: prompt }],
        }),
      });
  
      const data = await response.json();
  
      // Clean up and ensure we get a valid array from the response content
      const cleanedContent = data.choices[0].message.content
        .replace(/```json/g, "") // Remove the code block markers
        .replace(/```/g, "") // Remove any backticks
        .trim(); // Trim any excess whitespace
  
      // Parse the cleaned content as a JSON array
      return JSON.parse(cleanedContent || "[]");
    } catch (error) {
      console.error("Error:", error);
      return [];
    }
  };
  