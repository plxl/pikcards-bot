import { client } from "./client";
import { registerCommands } from "./handlers/commandHandler";
import { REST, Routes } from "discord.js";

async function main() {
    await registerCommands(client);
    console.log(`Started refreshing ${client.commands.size} application (/) commands.`);

    const missing_env = [];
    if (!process.env["TOKEN"]) missing_env.push("TOKEN");
    if (!process.env["CLIENT_ID"]) missing_env.push("CLIENT_ID");
    if (missing_env.length > 0)
        return console.error(`Required environment variables not set: ${missing_env.join(", ")}`);

    const token = process.env["TOKEN"]!;
    const clientId = process.env["CLIENT_ID"]!;

    const rest = new REST().setToken(token);

    // put method fully refreshes all commands
    const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: Array.from(client.commands.values()).map(cmd => cmd.data.toJSON()) },
    ) as any[];

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
}

main().catch((err) => {
    console.error("Failed to deploy commands:", err)
});
