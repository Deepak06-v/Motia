import { EventConfig } from "motia";

export const config: EventConfig = {
  name: "fetchVideos",
  type: "event",
  subscribes: ["yt.channel.resolved"],
  emits: ["yt.videos.fetched", "yt.videos.error"],
  flows: ["Title Enhancer"],
};

export const handler = async (
  eventData: any,
  { emit, state }: any
) => {
  interface Video {
  videoId: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  thumbnail: string;
  tags: string[];
}

  const { job_id, email, channelId, channelName } = eventData;
  if (!job_id || !channelId || !email) return;

  try {
    const job = await state.get("job", job_id);

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("Missing API key");

    await state.set("job", job_id, {
      ...job,
      status: "fetching_videos",
    });

    // 1️⃣ Get latest video IDs
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&order=date&type=video&maxResults=5&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.items?.length) {
      throw new Error("No videos found");
    }

    const videoIds = searchData.items
      .map((item: any) => item.id.videoId)
      .join(",");

    // 2️⃣ Fetch full video details INCLUDING TAGS
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds}&key=${apiKey}`;
    const videosRes = await fetch(videosUrl);
    const videosData = await videosRes.json();

    const videos = videosData.items.map((item: any) => ({
      videoId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      url: `https://www.youtube.com/watch?v=${item.id}`,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails.default.url,
      tags: item.snippet.tags ?? [], // 🔥 THIS IS THE POINT
    }));

    await state.set("job", job_id, {
      ...job,
      status: "success",
      videos,
    });

    await emit({
      topic: "yt.videos.fetched",
      data: {
        job_id,
        email,
        channelName,
        videos,
      },
    });

  } catch (error: any) {
    await state.set("job", job_id, {
      status: "failed",
      error: error.message,
    });

    await emit({
      topic: "yt.videos.error",
      data: {
        job_id,
        email,
        error: error.message,
      },
    });
  }
};
