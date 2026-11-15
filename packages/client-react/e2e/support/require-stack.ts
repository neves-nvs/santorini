const STACK_URL = "http://localhost:5174/api/readyz";

export default async function requireStack() {
  const response = await fetch(STACK_URL).catch(() => null);
  if (response?.ok) {
    return;
  }

  const problem = response
    ? `The server cannot reach its database (${STACK_URL} answered ${response.status}).`
    : `Nothing answered at ${STACK_URL}: the client and the server are not both running on ports 5174 and 3000.`;
  throw new Error(`${problem}\nRun the suite with scripts/e2e, which starts a throwaway database, the server and the client.`);
}
