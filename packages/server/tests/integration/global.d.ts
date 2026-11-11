 
import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

declare global {
  var container: StartedPostgreSqlContainer;
}
