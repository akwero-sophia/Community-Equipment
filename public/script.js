const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            });

            const data = await response.json();

            document.getElementById("message").textContent =
                data.message;

            if (response.ok) {
                registerForm.reset();

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1500);
            }
        } catch (error) {
            console.error(error);

            document.getElementById("message").textContent =
                "Something went wrong. Please try again.";
        }
    });
}


const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            document.getElementById("loginMessage").textContent =
                data.message;

            if (response.ok) {
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1000);
            }
        } catch (error) {
            console.error(error);

            document.getElementById("loginMessage").textContent =
                "Something went wrong. Please try again.";
        }
    });
}