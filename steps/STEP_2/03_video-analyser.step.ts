import { EventConfig } from "motia";

export const config: EventConfig = {
  name: "analyseVideos",
  type: "event",
  subscribes: ["content.video.resolved"],
  emits: ["content.video.analysed", "content.video.analysation.error"],
  flows: ["weekly_report"],
};

export const handler = async (
  eventData: any,
  { emit, state, logger }: any
) => {
  const { job_id,channelId, channelName, email, videos } = eventData;
  if (!channelId || !email) return;

  await state.set("job", job_id, {
    job_id,
    channelId,
    channelName,
    email,
    videos,
    status: "making_report",
    createdAt: new Date().toISOString(),
  });

  const job = await state.get("job", job_id);

  try {
    
    const title=videos.title;
    const description=videos.description;
    const publishedAt=videos.publishedAt;
    const tags=videos.tags;
    
    

  } catch (error:any) {
    await state.set("job", job_id, {
      ...job,
      status: "failed",
      error: error.message,
    });

    await emit({
      topic: "content.video.analysation.error",
      data: {
        job_id,
        email,
        error: error.message,
      },
    });
  }
}