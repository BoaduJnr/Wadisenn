// Deploy-only build entry point. Runs tsc and vite build programmatically via
// Deno.Command instead of a shell string, since chained "&&" shell commands
// passed through Deno Deploy's build sandbox proved unreliable there.

async function run(cmd: string, args: string[]) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  const command = new Deno.Command(cmd, {
    args,
    cwd: "client",
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await command.output();
  if (code !== 0) {
    console.error(`Command failed with exit code ${code}: ${cmd} ${args.join(" ")}`);
    Deno.exit(code);
  }
}

await run("node", ["node_modules/typescript/bin/tsc", "-b"]);
await run("node", ["node_modules/vite/bin/vite.js", "build"]);
console.log("Build complete.");
