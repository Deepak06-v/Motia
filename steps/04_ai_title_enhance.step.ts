    import { EventConfig } from "motia";

    export const config: EventConfig = {
    name: "generateTitles",
    type: "event",
    subscribes: ["yt.videos.fetched"],
    emits: ["yt.titles.ready", "yt.titles.error"],
    flows:["Title Enhancer"]
};

    interface Video {
  videoId: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  thumbnail: string;
  tags: string[];
}

    interface ImprovedContent {
  originalTitle: string;
  improvedTitle: string;
  originalDescription: string;
  improvedDescription: string;
  suggestedTags: string[];
  rationale: string;
  url: string;
}
    export const handler = async (
    eventData: any,
    { emit, state }: any
    ) => {
        const { job_id,
            email,
            channelName,
            videos,} = eventData;

    if (!job_id || !email) return;
        try {
            
            const job = await state.get("job", job_id);
            const openaiapiKey = process.env.OPEN_AI_API_KEY;
            if (!openaiapiKey) throw new Error("Missing API key");
            await state.set("job", job_id, {
                ...job,
                status: "generating_title",
            });
            const videoContext = videos
  .map(
    (v: Video, idx: number) => `
${idx + 1}.
Title: "${v.title}"
Description: "${v.description}"
Existing Tags: ${v.tags.length ? v.tags.join(", ") : "None"}
`
  )
  .join("\n");


            const prompt = `
You are a YouTube SEO optimization expert.

Below are ${videos.length} videos from the channel "${channelName}".

For EACH video, provide:
1. An improved YouTube TITLE (SEO + CTR optimized)
2. An improved DESCRIPTION (first 2 lines highly optimized)
3. A list of SUGGESTED TAGS (comma-separated, SEO focused)
4. A brief rationale (1–2 sentences)

Rules:
- Preserve the core topic
- No clickbait
- Optimize for YouTube search + recommendations
- Tags must be relevant and non-repetitive

Videos:
${videoContext}

Respond ONLY in valid JSON:

{
  "videos": [
    {
      "originalTitle": "...",
      "improvedTitle": "...",
      "originalDescription": "...",
      "improvedDescription": "...",
      "suggestedTags": ["tag1", "tag2"],
      "rationale": "..."
    }
  ]
}
`;


            const response= await fetch('https://api.openai.com/v1/chat/completions',{
                method:'POST',
                headers:{
                    'Content-Type':"application/json",
                    'Authorization':`Bearer ${openaiapiKey}`
                },
                body:JSON.stringify({
                    model:'gpt-4o-mini',
                    messages:[
                        {
                            role:'system',
                            content:"You are a youtube SEO and engagement expert who helps creators write better video titles"

                        },
                        {
                            role:'user',
                            content:prompt
                        }
                    ],
                    temperature:0.7,
                    response_format:{type:'json_object'}
                })
            })
            if(!response.ok){
                const errorData=await response.json()
                throw new Error(`OpenAI API error:${errorData.error?.message}||"Unknown AI error"`)
            }
            const aiResponse= await response.json()
            const aiContent=aiResponse.choices[0].message.content;
            const parsedResponse=JSON.parse(aiContent)

           const improvedContent: ImprovedContent[] =
  parsedResponse.videos.map((item: any, idx: number) => ({
    originalTitle: item.originalTitle,
    improvedTitle: item.improvedTitle,
    originalDescription: item.originalDescription,
    improvedDescription: item.improvedDescription,
    suggestedTags: item.suggestedTags ?? [],
    rationale: item.rationale,
    url: videos[idx].url,
  }));

            
        await state.set("job", job_id, {
  status: "titles_ready",
  improvedContent,
});

        await emit({
  topic: "yt.titles.ready",
  data: {
    job_id,
    email,
    channelName,
    improvedContent,
  },
});


        }catch (error: any) {
        await state.set("job", job_id, {
        status: "failed",
        error: error.message,
        });

        await emit({
        topic: "yt.titles.error",
        data: {
            job_id,
            email,
            error: error.message,
        },
        });
    }
    };
