import { BASE_URL } from "../constants";

export async function getToken(username: string, password: string) {
  const response = await fetch(`${BASE_URL}/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": `http://localhost:5173`,
    },
    body: JSON.stringify({ username, password }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to log in");
  }
}
