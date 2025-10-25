import { client } from "./client";
import { registerCommands } from "./handlers/commandHandler";
import { registerEvents } from "./handlers/eventHandler";

async function main() {
    await registerCommands(client);
    await registerEvents(client);
    await client.login(process.env["TOKEN"]);
}

main().catch((err) => {
    console.error("Failed to start bot:", err)
});
