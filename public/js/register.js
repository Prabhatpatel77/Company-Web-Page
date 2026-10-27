const registerForm =
    document.getElementById("registerForm");
const message =
    document.getElementById("message");
registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const userData = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        role: document.getElementById("role").value,
        department:
            document.getElementById("department").value,
        phone:
            document.getElementById("phone").value
    };
    try {
        const response = await fetch(
            "/api/register",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(userData)
            }
        );
        const data = await response.json();
        if (!response.ok) {
            message.textContent = data.message;
            message.style.color = "red";
            return;
        }
        message.textContent =
            "Registration successful! Redirecting...";
        message.style.color = "green";
        setTimeout(() => {
            window.location.href =
                "login.html";
        }, 1500);
    } catch (error) {
        console.error(error);
        message.textContent =
            "Something went wrong";
        message.style.color = "red";
    }
});