import { EventConfig } from "motia";

    export const config: EventConfig = {
    name: "SendTitles",
    type: "event",
    subscribes: ["yt.channel.error",'yt.videos.error','yt.titles.error'],
    emits: ["yt.error.notified"]
};


    export const handler = async (
    eventData: any,
    { emit, state }: any
    ) => {
        try {
             const data=eventData||{}
    const job_id=data.job_id;
    const email=data.email;
    const channelName=data.channelName;
    const from=process.env.FROM_EMAIL
    const resendapiKey = process.env.MOTIA_KEY;
    if (!resendapiKey) throw new Error("Missing API key");

    const emailText=`We are facing the issue while enahancing the titlw for ${channelName}`
    const response=await fetch('https://api.resend.com/emails',{
              method:'POST',
              headers:{
                'COntent-Type':'application/json',
              'Authorization':`Bearer ${resendapiKey}`              
            },
            body:JSON.stringify({
              from:from,
              to:[email],
              subject:`Request failed for the title enhancer`,
              text:emailText
            })
            })
            const emailResult=await response.json()
            if(!response.ok){
                const errorData=await response.json()
                throw new Error(`Resend API error:${errorData.error?.message}||"Unknown email error"`)
            }
            await emit({
                topic:'yt.error.notified',
                data:{
                    job_id,
                    email,
                    emailId:emailResult.id
                }
            })
        } catch (error:any) {
            const data=eventData||{}
              const job_id=data.job_id;
              const email=data.email;
            await state.set("job", job_id, {
              status: "failed",
              error: error.message,
        });
        }
   
}