import { createApp } from "./app.ts";
import { env } from "./env.ts";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`🚀 Admissions Readiness API listening on http://localhost:${env.PORT}`);
});
