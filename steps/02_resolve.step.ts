import { EventConfig } from "motia";

export const config: EventConfig = {
  name: "ResolveChannel",
  type: "event",
  subscribes: ["YTSubmit"],
  emits: ["yt.channel.resolved", "yt.channel.error"],
  flows:["Title Enhancer"]
};

export const handler = async (
  eventData: any,
  { emit, state }: any
) => {
  const { job_id, channel, email } = eventData;

  if (!job_id || !channel || !email) return;

  const job = await state.get("job", job_id);

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("Missing API key");

    await state.set("job", job_id, {
      ...job,
      status: "resolving_channel",
    });

    const q = channel.startsWith("@") ? channel.slice(1) : channel;

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
        q
      )}&key=${apiKey}`
    );

    const data = await res.json();
    if (!data.items?.length) throw new Error("Channel not found");

    const channelId = data.items[0].id.channelId;
    const channelName = data.items[0].snippet.title;

    await state.set("job", job_id, {
      ...job,
      status: "resolved",
      channelId,
      channelName,
    });

    await emit({
      topic: "yt.channel.resolved",
      data: {
        job_id,          // ✅ CONSISTENT
        email,
        channelId,
        channelName,
      },
    });

  } catch (err: any) {
    await state.set("job", job_id, {
      ...job,
      status: "failed",
      error: err.message,
    });

    await emit({
      topic: "yt.channel.error",
      data: {
        job_id,
        email,
        error: err.message,
      },
    });
  }
};
