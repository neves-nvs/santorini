const apiUrl = "http://localhost:3000";

// Authentication
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const googleLoginButton = document.getElementById("google-login");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    const response = await fetch(`${apiUrl}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, password: password }),
    });

    if (response.ok) {
      window.location.href = "game.html";
    } else {
      alert("Login failed");
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;

    const response = await fetch(`${apiUrl}/users`, {
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
    window.location.href = `${apiUrl}/auth/google`;
  });
}
