import { CronConfig } from "motia";

export const config: CronConfig = {
  type: "cron",
  name: "contentHealthMonitor",
  description: "Weekly content health scan",
  cron: "0 9 * * 1", // Every Monday at 9 AM
  emits: ["content.video.scan"],
  flows: ["weekly_report"],
};

export const handler = async ({
  emit,
  logger,
  state,
}: any) => {
  logger?.info("Content health monitor started");

  try {
    const channels = await state.list("channel_config");

    for (const ch of channels) {
      if (!ch.monitoringEnabled) continue;

      await emit({
        topic: "content.video.scan",
        data: {
          channelId: ch.channelId,
          channelName: ch.channelName,
          email: ch.email,
          limit: ch.weeklyLimit ?? 10,
        },
      });
    }
  } catch (error: any) {
    logger?.error("Content health monitor error", {
      error: error.message,
    });
  }
};
