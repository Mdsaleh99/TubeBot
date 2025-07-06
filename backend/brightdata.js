import dotenv from "dotenv";

dotenv.config();

const brightDataTriggerUrl = "https://api.brightdata.com/datasets/v3/trigger";
const webhookUrl = `${process.env.BRIGHTDATA_WEBHOOK_URL}/webhook`

export const triggerYoutubeVideoScrape = async (url) => { 
    const data = JSON.stringify([
        { url, country: "" },
    ]);

    const response = await fetch(
        `${brightDataTriggerUrl}?dataset_id=gd_lk56epmy2i5g7lzu0k&endpoint=${webhookUrl}&format=json&uncompressed_webhook=true&include_errors=true`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.BRIGHTDATA_HEADER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: data,
        }
    )
        
    const result = await response.json();
    // if (!response.ok) {
    //     throw new Error(`Error: ${result.error || "Failed to trigger scrape"}`);
    // }
    console.log("Scrape triggered successfully:", result);

    return result.snapshot_id;
}

triggerYoutubeVideoScrape("https://www.youtube.com/watch?v=fuhE6PYnRMc");