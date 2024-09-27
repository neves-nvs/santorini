export default async function globalTeardown() {
  if (globalThis.container) {
    await globalThis.container.stop();
  }
}
