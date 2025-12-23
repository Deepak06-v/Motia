import { EventConfig } from "motia";

export const config: EventConfig = {
  name: "SendTitles",
  type: "event",
  subscribes: ["yt.titles.ready"],
  emits: ["yt.titles.send"],
  flows: ["Title Enhancer"],
};

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
  const data = eventData || {};
  const { job_id, email, channelName, improvedContent } = data;


  try {
    if (!job_id || !email || !channelName || !improvedContent?.length) {
  throw new Error("Missing required data for sending email");
}


    const resendApiKey = process.env.RESEND_API_KEY;
    const from = process.env.FROM_EMAIL;

    if (!resendApiKey) throw new Error("Missing RESEND_API_KEY");
    if (!from) throw new Error("Missing FROM_EMAIL");

    const job = await state.get("job", job_id);

    await state.set("job", job_id, {
      ...job,
      status: "sending_title_emails",
    });

    const emailText = generateEmailText(channelName, improvedContent);


    const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${resendApiKey}`,
  },
  body: JSON.stringify({
    from,
    to: email,
    subject: `New titles for ${channelName}`,
    text: emailText,
  }),
});

if (!response.ok) {
  const errorData = await response.json();
  console.error("RESEND ERROR:", errorData);
  throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
}
    const emailResult = await response.json();

    await state.set("job", job_id, {
      ...job,
      status: "completed",
      emailId: emailResult.id,
      completedAt: new Date().toISOString(),
    });

    await emit({
      topic: "yt.titles.send",
      data: {
        job_id,
        email,
        emailId: emailResult.id,
      },
    });
  } catch (error: any) {
    await state.set("job", job_id, {
      status: "failed",
      error: error.message,
    });
  }
};

function generateEmailText(
  channelName: string,
  videos: ImprovedContent[]
): string {
  let text = `YouTube Optimization Report for ${channelName}\n`;
  text += `${"=".repeat(70)}\n\n`;

  videos.forEach((v, index) => {
    text += `Video ${index + 1}\n`;
    text += `----------------------\n`;
    text += `Original Title:\n${v.originalTitle}\n\n`;
    text += `Improved Title:\n${v.improvedTitle}\n\n`;
    text += `Original Description:\n${v.originalDescription}\n\n`;
    text += `Improved Description:\n${v.improvedDescription}\n\n`;
    text += `Suggested Tags:\n${v.suggestedTags.join(", ") || "None"}\n\n`;
    text += `Why This Works:\n${v.rationale}\n\n`;
    text += `Watch Video:\n${v.url}\n`;
    text += `${"-".repeat(70)}\n\n`;
  });

  text += `Powered by Motia · AI for Creators\n`;
  return text;
}
