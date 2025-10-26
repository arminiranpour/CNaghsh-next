import net from "node:net";

const ports = [3000, 5555, 5556];

for (const port of ports) {
  const server = net.createServer();
  server.once("error", () => {
    console.error(`❌ Port ${port} is in use`);
  });
  server.once("listening", () => {
    console.log(`✅ Port ${port} is available`);
    server.close();
  });

  server.listen(port, "127.0.0.1");
}
