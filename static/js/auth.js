import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// Make auth available globally
window.auth = null;

// Fetch config and initialize Firebase
fetch("/get-firebase-config")
    .then((response) => response.json())
    .then((firebaseConfig) => {
        const app = initializeApp(firebaseConfig);
        window.auth = getAuth(app); // Assign to global window object
        
        // Listen for authentication state changes
        onAuthStateChanged(window.auth, (user) => {
            console.log("Auth state changed. User:", user);
            const currentPath = window.location.pathname;

            if (user) {
                // User is signed in.
                // If they are on the login page, redirect to dashboard.
                if (currentPath === "/" || currentPath.startsWith('/login')) {
                    console.log("User is on login page, redirecting to dashboard.");
                    window.location.href = "/dashboard";
                }
            } else {
                // User is signed out.
                // If they are on a protected page (dashboard or editor), redirect to login.
                if (currentPath.startsWith('/dashboard') || currentPath.startsWith('/editor')) {
                    console.log("User is on protected page, redirecting to login.");
                    window.location.href = "/";
                }
            }
        });

        // Add login button event listener
        const loginBtn = document.getElementById("login-btn");
        if (loginBtn) {
            loginBtn.addEventListener("click", signInWithGoogle);
        }

        // Add logout button event listener
        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", signOutUser);
        }

    })
    .catch((error) => {
        console.error("Error fetching Firebase config:", error);
        const status = document.getElementById("status");
        if(status) status.textContent = "Error: Could not load app configuration.";
    });


// Function to sign in with Google
function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const status = document.getElementById("status");
    if(status) status.textContent = "Signing in...";

    signInWithPopup(window.auth, provider)
        .then((result) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            // The signed-in user info.
            const user = result.user;
            console.log("Signed in successfully:", user);
            // Redirect to dashboard, onAuthStateChanged will also handle this
            window.location.href = "/dashboard";
        })
        .catch((error) => {
            console.error("Error during sign in:", error);
            if(status) status.textContent = `Error: ${error.message}`;
        });
}

// Function to sign out
function signOutUser() {
    signOut(window.auth)
        .then(() => {
            console.log("Signed out successfully.");
            // Redirect to login page, onAuthStateChanged will also handle this
            window.location.href = "/";
        })
        .catch((error) => {
            console.error("Error during sign out:", error);
        });
} 