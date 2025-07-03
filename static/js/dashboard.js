import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // We need to wait for the auth object to be initialized
    // It's attached to the window object by auth.js
    const authInterval = setInterval(() => {
        if (window.auth) {
            clearInterval(authInterval);
            const auth = window.auth;

            onAuthStateChanged(auth, (user) => {
                if (user) {
                    // User is signed in, load their lessons.
                    loadLessons(user);
                }
            });
        }
    }, 100);

    const createNewBtn = document.getElementById('create-new-btn');
    if (createNewBtn) {
        createNewBtn.addEventListener('click', () => {
            window.location.href = '/editor';
        });
    }
});

async function loadLessons(user) {
    const lessonsGrid = document.getElementById('lessons-grid');
    if (!lessonsGrid) return;

    try {
        const idToken = await user.getIdToken();
        const response = await fetch('/get_lessons', {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });

        const result = await response.json();

        if (result.success && result.lessons.length > 0) {
            lessonsGrid.innerHTML = ''; // Clear placeholder
            result.lessons.forEach(lesson => {
                const card = createLessonCard(lesson);
                lessonsGrid.appendChild(card);
            });
        } else if (!result.success) {
            throw new Error(result.error || "Could not fetch lessons.");
        }
        // If there are no lessons, the placeholder will remain.

    } catch (error) {
        console.error("Error loading lessons:", error);
        lessonsGrid.innerHTML = '<p style="color: #ff8a80;">Error loading lessons. Please try again.</p>';
    }
}

function createLessonCard(lesson) {
    const card = document.createElement('div');
    card.className = 'lesson-card';
    card.dataset.lessonId = lesson.id;

    card.innerHTML = `
        <div class="lesson-card-icon">👋</div>
        <h3></h3>
        <p></p>
    `;
    card.querySelector('h3').textContent = lesson.title;
    card.querySelector('p').textContent = `Last modified: ${lesson.lastModified}`;

    card.addEventListener('click', () => {
        window.location.href = `/editor/${lesson.id}`;
    });

    return card;
} 