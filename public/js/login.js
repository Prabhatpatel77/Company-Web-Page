const loginForm =
    document.getElementById("loginForm");

const message =
    document.getElementById("message");
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const loginData = {
        email:
            document.getElementById("email").value,
        password:
            document.getElementById("password").value
    };


    try {

        const response = await fetch(
            "/api/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(loginData)
            }
        );


        const data = await response.json();


        if (!response.ok) {

            message.textContent =
                data.message;

            message.style.color = "red";

            return;
        }


        message.textContent =
            "Login successful!";

        message.style.color = "green";


        setTimeout(() => {

            window.location.href =
                "dashboard.html";

        }, 700);


    } catch (error) {

        console.error(error);

        message.textContent =
            "Unable to connect to server";

        message.style.color = "red";

    }

});