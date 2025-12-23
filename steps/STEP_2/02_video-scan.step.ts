import { EventConfig } from "motia";

export const config: EventConfig = {
  name: "scanVideos",
  type: "event",
  subscribes: ["content.video.scan"],
  emits: ["content.video.resolved", "content.video.error"],
  flows: ["weekly_report"],
};

export const handler = async (
  eventData: any,
  { emit, state, logger }: any
) => {
  const { channelId, channelName, email, limit = 10 } = eventData;
  if (!channelId || !email) return;

  const job_id = `job_${Date.now()}`;

  await state.set("job", job_id, {
    job_id,
    channelId,
    channelName,
    email,
    status: "scanning_videos",
    createdAt: new Date().toISOString(),
  });

  try {
    /* ===============================
       STEP 1: DATA API (metadata)
    ================================ */
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("Missing YOUTUBE_API_KEY");

    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&maxResults=${limit}&order=date&type=video&key=${apiKey}`
    );

    const searchData = await searchRes.json();
    const videoIds: string[] = searchData.items.map(
      (item: any) => item.id.videoId
    );

    if (!videoIds.length) throw new Error("No videos found");

    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds.join(",")}&key=${apiKey}`
    );

    const videosData = await videosRes.json();

    const baseVideos = videosData.items.map((item: any) => ({
      videoId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id}`,
      thumbnail: item.snippet.thumbnails?.default?.url,
      tags: item.snippet.tags ?? [],
    }));

    /* ===============================
       STEP 2: ANALYTICS API (metrics)
    ================================ */
    const accessToken = await state.get("oauth", channelId);
    if (!accessToken) throw new Error("Missing OAuth token");

    const analyticsRes = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports` +
        `?ids=channel==MINE` +
        `&startDate=2024-01-01` +
        `&endDate=2024-12-31` +
        `&metrics=views,averageViewDuration,impressionsCtr` +
        `&dimensions=video` +
        `&filters=video==${videoIds.join(",")}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const analyticsData = await analyticsRes.json();

    const analyticsMap = new Map<string, any>();
    analyticsData.rows?.forEach((row: any[]) => {
      analyticsMap.set(row[0], {
        views: row[1],
        avgWatchTime: row[2],
        ctr: row[3],
      });
    });

    /* ===============================
       STEP 3: MERGE DATA + ANALYTICS
    ================================ */
    const videos = baseVideos.map((video: any) => ({
      ...video,
      analytics: analyticsMap.get(video.videoId) ?? {
        views: 0,
        avgWatchTime: 0,
        ctr: 0,
      },
    }));

    await state.set("job", job_id, {
      job_id,
      status: "videos_enriched",
      videos,
    });

    await emit({
      topic: "content.video.resolved",
      data: {
        job_id,
        channelId,
        channelName,
        email,
        videos,
      },
    });
  } catch (error: any) {
    logger?.error("Video scan failed", { error: error.message });

    await emit({
      topic: "content.video.error",
      data: {
        job_id,
        channelId,
        email,
        error: error.message,
      },
    });
  }
};
