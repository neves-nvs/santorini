 
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

declare global {
  var container: StartedPostgreSqlContainer;
}
