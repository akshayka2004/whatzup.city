import { app } from "./app";
import { env } from "./config/env";

app.listen(env.port, () => {
  console.log(`Kerala Flood Relief Portal API listening on port ${env.port} [${env.nodeEnv}]`);
});
