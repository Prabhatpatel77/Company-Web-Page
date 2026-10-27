const userName =
    document.getElementById("userName");

const userRole =
    document.getElementById("userRole");

const avatar =
    document.getElementById("avatar");

const welcome =
    document.getElementById("welcome");

const profileName =
    document.getElementById("profileName");

const profileEmail =
    document.getElementById("profileEmail");

const profileRole =
    document.getElementById("profileRole");

const tableTitle =
    document.getElementById("tableTitle");

const userTable =
    document.getElementById("userTable");

const tableHead =
    document.querySelector("thead tr");

const logoutButton =
    document.getElementById("logoutButton");


// ==================================
// LOAD DASHBOARD
// ==================================

async function loadDashboard() {

    try {

        // Get logged-in user

        const meResponse =
            await fetch("/api/me");


        if (!meResponse.ok) {

            window.location.href =
                "login.html";

            return;
        }


        const meData =
            await meResponse.json();


        const user =
            meData.user;


        // Display profile

        userName.textContent =
            user.name;

        userRole.textContent =
            user.role.toUpperCase();

        avatar.textContent =
            user.name.charAt(0).toUpperCase();

        welcome.textContent =
            `Welcome, ${user.name}`;

        profileName.textContent =
            user.name;

        profileEmail.textContent =
            user.email;

        profileRole.textContent =
            user.role.toUpperCase();


        // ==================================
        // EMPLOYEE
        // ==================================

        if (user.role === "employee") {

            tableTitle.textContent =
                "Administrator Details";

            await loadAdmins();

        }


        // ==================================
        // ADMIN
        // ==================================

        else if (user.role === "admin") {

            tableTitle.textContent =
                "Employee Details";

            await loadEmployees();

        }


    } catch (error) {

        console.error(error);

    }

}


// ==================================
// LOAD ADMINS
// ==================================

async function loadAdmins() {

    tableHead.innerHTML = `
        <th>ID</th>
        <th>Name</th>
        <th>Email</th>
        <th>Department</th>
        <th>Phone</th>
        <th>Role</th>
    `;

    const response =
        await fetch("/api/admins");


    if (!response.ok) {

        alert("Unable to load admin details");

        return;
    }


    const admins =
        await response.json();


    displayUsers(admins, "admin");

}


// ==================================
// LOAD EMPLOYEES
// ==================================

async function loadEmployees() {

    tableHead.innerHTML = `
        <th>ID</th>
        <th>Name</th>
        <th>Email</th>
        <th>Department</th>
        <th>Phone</th>
        <th>Status</th>
        <th>Action</th>
    `;

    const response =
        await fetch("/api/employees");


    if (!response.ok) {

        alert("Unable to load employee details");

        return;
    }


    const employees =
        await response.json();


    displayUsers(employees, "employee");

}


// ==================================
// DISPLAY USERS
// ==================================

function displayUsers(users, role) {

    userTable.innerHTML = "";


    if (users.length === 0) {

        userTable.innerHTML = `
            <tr>
                <td colspan="${role === "employee" ? 7 : 6}">
                    No ${role}s found
                </td>
            </tr>
        `;

        return;
    }


    users.forEach(user => {

        const row =
            document.createElement("tr");


        if (role === "employee") {

            row.innerHTML = `

                <td>${user.id}</td>

                <td>
                    <strong>
                        ${user.name}
                    </strong>
                </td>

                <td>
                    ${user.email}
                </td>

                <td>
                    ${user.department || "-"}
                </td>

                <td>
                    ${user.phone || "-"}
                </td>

                <td>
                    <span class="status-badge ${user.approval_status}">
                        ${user.approval_status.toUpperCase()}
                    </span>
                </td>

                <td>
                    ${
                        user.approval_status === "pending"
                            ? `
                                <div class="approval-actions">
                                    <button
                                        class="approve-button"
                                        data-id="${user.id}">
                                        Approve
                                    </button>
                                    <button
                                        class="reject-button"
                                        data-id="${user.id}">
                                        Reject
                                    </button>
                                </div>
                            `
                            : "-"
                    }
                </td>

            `;

        } else {

            row.innerHTML = `

            <td>${user.id}</td>

            <td>
                <strong>
                    ${user.name}
                </strong>
            </td>

            <td>
                ${user.email}
            </td>

            <td>
                ${user.department || "-"}
            </td>

            <td>
                ${user.phone || "-"}
            </td>

            <td>

                <span class="role-badge">

                    ${role.toUpperCase()}

                </span>

            </td>

        `;

        }


        userTable.appendChild(row);

    });

}


// ==================================
// APPROVE / REJECT EMPLOYEE
// ==================================

userTable.addEventListener("click", async (event) => {

    const approveButton =
        event.target.closest(".approve-button");

    const rejectButton =
        event.target.closest(".reject-button");

    if (!approveButton && !rejectButton) {

        return;

    }

    const button =
        approveButton || rejectButton;

    const action =
        approveButton ? "approve" : "reject";

    try {

        const response = await fetch(
            `/api/employees/${button.dataset.id}/approval`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ action })
            }
        );

        const data =
            await response.json();

        if (!response.ok) {

            alert(data.message);

            return;

        }

        await loadEmployees();

    } catch (error) {

        console.error(error);

        alert("Unable to update employee approval");

    }

});


// ==================================
// LOGOUT
// ==================================

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await fetch(
                "/api/logout",
                {
                    method: "POST"
                }
            );


            window.location.href =
                "login.html";


        } catch (error) {

            console.error(error);

        }

    }
);


// Start dashboard

loadDashboard();
