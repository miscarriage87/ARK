import { getDailyQuote } from "../src/lib/ai-service";

const userId = "445297ed-9d86-43a0-b334-b16c7c7ee418";
const date = "2026-01-10";

console.log(`Generating quote for userId=${userId}, date=${date}`);

getDailyQuote(userId, date)
    .then(result => {
        console.log("Success:", result);
        process.exit(0);
    })
    .catch(err => {
        console.error("Error:", err);
        process.exit(1);
    });
