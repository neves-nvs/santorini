export default async function globalTeardown() {
  if (global.container) {
    await global.container.stop();
  }
}
