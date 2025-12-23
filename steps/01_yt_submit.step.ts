import { ApiRouteConfig, Handlers } from "motia";

export const config: ApiRouteConfig = {
  name: "YTSubmitApi",
  type: "api",
  path: "/submit",
  method: "POST",
  emits: ["YTSubmit"],
  flows:["Title Enhancer"]
};

export const handler: Handlers["YTSubmitApi"] = async (
  req: any,
  { emit, state }: any
) => {
  const { channel, email } = req.body;

  if (!channel || !email) {
    return { status: 400, body: { error: "Missing fields" } };
  }

  const job_id = `job_${Date.now()}`;

  // ---------- JOB (Step-1) ----------
  const job = {
    job_id,
    channel,
    email,
    status: "queued",
    createdAt: new Date().toISOString(),
  };

  await state.set("job", job_id, job);

  await state.set("channel_config", channel, {
    channelId: channel,
    channelName: channel,
    email,
    monitoringEnabled: true,
    weeklyLimit: 10,
    createdAt: new Date().toISOString(),
  });

  await emit({
    topic: "YTSubmit",
    data: job,
  });

  return {
    status: 202,
    body: { success: true, job_id },
  };
};
