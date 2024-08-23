import { getToken } from "@services/authService";
import { BASE_URL } from "../../constants";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const googleLoginButton = document.getElementById("google-login");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = (document.getElementById("login-username") as HTMLInputElement).value;
    const password = (document.getElementById("login-password") as HTMLInputElement).value;

    try {
      await getToken(username, password); // todo handle error

      window.location.href = "/game.html";
    } catch (err) {
      console.log(err);
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = (document.getElementById("register-username") as HTMLInputElement).value;
    const password = (document.getElementById("register-password") as HTMLInputElement).value;

    const response = await fetch(`${BASE_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      alert("Registration successful");
    } else if (response.status === 409) {
      alert("User already exists");
    } else {
      alert("Registration failed");
    }
  });
}

if (googleLoginButton) {
  googleLoginButton.addEventListener("click", () => {
    window.location.href = `${BASE_URL}/auth/google`;
  });
}
