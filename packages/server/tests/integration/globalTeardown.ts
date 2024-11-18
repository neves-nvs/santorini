export default async function globalTeardown() {
  if (global.container) {
    console.log("Stopping container");
    await global.container.stop();
  }
}
