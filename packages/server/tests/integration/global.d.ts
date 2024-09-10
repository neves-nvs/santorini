/* eslint-disable no-var */
import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

declare global {
  var container: StartedPostgreSqlContainer | undefined;
  var database: Kysely<Database> | undefined;
}
