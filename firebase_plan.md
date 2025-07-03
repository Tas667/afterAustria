# Firebase Integration Plan: From Single-User Tool to Multi-User CLIL Notebook

This document outlines the step-by-step plan to integrate Google Firebase into the CLIL Activity Generator, transforming it into a multi-user application with persistent storage.

---

### **Phase 1: Project Setup & Backend Configuration**

**Goal:** Establish a secure connection between our Flask application and a new Firebase project.

- [x] **Step 1.1: Firebase Project Creation**
- [x] **Step 1.2: Backend Firebase Admin Setup**
- [x] **Step 1.3: Update Flask Backend (`app.py`)**

**Step 1.1: Firebase Project Creation**
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a new Firebase project.
3.  From the project dashboard, add a new **Web App**.
4.  Copy the `firebaseConfig` object provided. We will need this for the frontend.
5.  In the console, go to **Authentication** -> **Sign-in method** and enable the **Google** provider.
6.  Go to **Firestore Database** and create a new database in **Production mode**.

**Step 1.2: Backend Firebase Admin Setup**
1.  In the Firebase Console, go to **Project Settings** -> **Service accounts**.
2.  Click **"Generate new private key"**. This will download a JSON file.
3.  **Crucially, do not commit this file to version control.** We will use environment variables to store its contents.
4.  In your Python project, install the Firebase Admin SDK:
    ```bash
    pip install firebase-admin
    ```
5.  Set up environment variables for the Firebase credentials and the client-side config (e.g., in a `.env` file).

**Step 1.3: Update Flask Backend (`app.py`)**
1.  **Initialize Firebase Admin:** At the top of `app.py`, add code to initialize the admin SDK using the credentials from your environment.
2.  **Create Config Endpoint:** Add a new route `/get-firebase-config` to securely pass the client-side configuration to the frontend JavaScript. This prevents hardcoding credentials in the client code.

---

### **Phase 2: User Authentication Flow**

**Goal:** Create a complete login/logout and user session management flow.

- [x] **Step 2.1: Create New HTML Pages**
- [x] **Step 2.2: Create Authentication JavaScript (`auth.js`)**
- [x] **Step 2.3: Update Flask Routes (`app.py`)**

**Step 2.1: Create New HTML Pages**
1.  Create `templates/login.html`: A simple page with a "Sign in with Google" button. This is the new entry point for unauthenticated users.
2.  Create `templates/dashboard.html`: This page will be the user's home base after logging in. It will initially be an empty container with a "Create New Lesson" button and a placeholder for where lesson cards will go. It will also have a "Logout" button.

**Step 2.2: Create Authentication JavaScript (`auth.js`)**
1.  Create a new file `static/js/auth.js`.
2.  This script will handle all client-side authentication logic:
    *   It will fetch the config from `/get-firebase-config`.
    *   It will initialize the Firebase JS SDK.
    *   It will use `onAuthStateChanged` to listen for login/logout events. If a user is logged in, it will redirect to `/dashboard`. If not, it will show the `/login` page content.
    *   It will contain functions for `signInWithGoogle` and `signOutUser`.

**Step 2.3: Update Flask Routes (`app.py`)**
1.  Modify the root route `/` to serve `login.html`.
2.  Add a new `/dashboard` route that serves `dashboard.html`.
3.  Add a new `/editor` route that serves the original `index.html`. This is now the dedicated lesson creation/editing page.

---

### **Phase 3: Saving & Loading the "Lesson Blueprint"**

**Goal:** Implement the core functionality to save and retrieve the entire state of a lesson.

- [x] **Step 3.1: Define the "Lesson Blueprint"**
- [x] **Step 3.2: Create Backend API Endpoints (`app.py`)**
- [x] **Step 3.3: Update Frontend Editor Logic (`script.js`)**

**Step 3.1: Define the "Lesson Blueprint"**
The data structure to be saved in Firestore for each lesson will be a JSON object:
```json
{
    "userId": "firebase-user-id",
    "title": "My First CLIL Lesson",
    "lastModified": "server-timestamp",
    "pillars": {
        "content": { "versions": ["..."], "currentIndex": 0 },
        "language": { "versions": ["..."], "currentIndex": 0 },
        "tasks": { "versions": ["..."], "currentIndex": 0 },
        "assessment": { "versions": ["..."], "currentIndex": 0 },
        "materials": { "versions": ["..."], "currentIndex": 0 }
    },
    "sideCards": [
        { "title": "...", "content": "..." }
    ],
    "chatHistory": [
        { "role": "user", "content": "..." }
    ],
    "chatContext": {
        "students_count": "25",
        "grade_level": "5th Grade",
        "language_skills": "B1",
        "vocab_density": "50",
        "grammar_complexity": "3",
        "content_language_balance": "50",
        "activity_types": ["station_rotation"]
    }
}
```

**Step 3.2: Create Backend API Endpoints (`app.py`)**
1.  **`/save_lesson` [POST]:**
    *   Receives the "blueprint" object and a lesson ID (if it's an existing lesson).
    *   Verifies the user's ID token.
    *   If it's a new lesson, it creates a new document in the `lessons` collection in Firestore.
    *   If it's an existing lesson, it updates the corresponding document.
2.  **`/get_lessons` [GET]:**
    *   Verifies the user's ID token.
    *   Queries Firestore for all lessons belonging to that `userId`.
    *   Returns a list of lessons with their `id`, `title`, and `lastModified` date for display on the dashboard.
3.  **`/load_lesson/<lesson_id>` [GET]:**
    *   Verifies the user can access this lesson.
    *   Fetches the complete "blueprint" document from Firestore by its ID.
    *   Returns the full JSON object to the client.

**Step 3.3: Update Frontend Editor Logic (`script.js`)**
1.  **Add Save/Update Logic:**
    *   Add a "Save" button to the editor UI (`index.html`).
    *   Create a `saveLesson()` function in `script.js`. This function will:
        *   Gather all required data from the page (`generatedSections`, `currentIndices`, helper cards content, chat context) and assemble the "blueprint" object.
        *   POST this object to the `/save_lesson` endpoint.
2.  **Add Load Logic:**
    *   Modify the editor's startup logic. When the page loads, it will check if the URL contains a lesson ID (e.g., `/editor/<lesson_id>`).
    *   If an ID is present, it will call the `/load_lesson/<lesson_id>` endpoint.
    *   Upon receiving the "blueprint", a new `loadLesson(data)` function will run. This function will be responsible for re-populating the *entire* UI: setting the content for all pillars, setting the correct version index, recreating all helper cards, and restoring the chat context.

---

### **Phase 4: UI/UX Integration**

**Goal:** Connect all the pieces into a seamless user experience.

- [x] **Step 4.1: Build the Dashboard (`dashboard.html` and `dashboard.js`)**
- [x] **Step 4.2: Finalize Editor UI (`index.html`)**

**Step 4.1: Build the Dashboard (`dashboard.html` and `dashboard.js`)**
1.  Style `dashboard.html` to match the NotebookLM reference, including the "+ Create new" button.
2.  Create `static/js/dashboard.js`. This script will:
    *   On page load, call the `/get_lessons` endpoint.
    *   Dynamically create and display a lesson card for each item returned.
    *   Each lesson card will link to `/editor/<lesson_id>`.
    *   The "+ Create new" button will link directly to `/editor`.

**Step 4.2: Finalize Editor UI (`index.html`)**
1.  Ensure the "Save" button is clearly visible and provides feedback (e.g., "Saving...", "Saved!").
2.  Add a "Back to Dashboard" link so users can easily navigate back from the editor.

---

### **Project Status: COMPLETE**

All phases of the initial Firebase integration are complete. The application now supports multi-user authentication, lesson saving to Firestore, and loading lessons from a user-specific dashboard. The core functionality is in place. 