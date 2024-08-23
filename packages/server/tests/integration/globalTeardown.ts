export default async function globalTeardown() {
  if (globalThis.container) {
    console.log("Container exists");
    await globalThis.container.stop();
  }
  console.log("Teardown complete");
}
