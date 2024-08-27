import logger from "../../src/logger";

export default async function globalTeardown() {
  if (globalThis.container) {
    logger.info("Stopping container");
    await globalThis.container.stop();
  }
  logger.info("Global teardown complete");
}
