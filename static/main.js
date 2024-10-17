function redirHome() {
    window.location.href = "/";
}

const lightButton = document.getElementById('light-button');
const darkButton = document.getElementById('dark-button');
const autoButton = document.getElementById('auto-button');

function switchLinkTheme(theme) {
    const links = document.querySelectorAll('.link-dark');
    const lightLinks = document.querySelectorAll('.link-light');
    if (theme === 'dark') {
        links.forEach(link => {
            link.classList.remove('link-dark');
            link.classList.add('link-light');
        });
    } else {
        lightLinks.forEach(link => {
            link.classList.remove('link-light');
            link.classList.add('link-dark');
        });
    }
}


window.addEventListener('load', function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
        document.documentElement.setAttribute('data-bs-theme', savedTheme);
        switchLinkTheme(savedTheme);
        setActiveButton(savedTheme);
    } else {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemPrefersDark) {
            document.documentElement.setAttribute('data-bs-theme', 'dark');
            switchLinkTheme('dark');
        } else {
            document.documentElement.setAttribute('data-bs-theme', 'light');
            switchLinkTheme('light');
        }
        setActiveButton('auto');
    }
});


function saveTheme(theme) {
    localStorage.setItem('theme', theme);
}


function setActiveButton(theme) {
    if (theme === 'light') {
        lightButton.classList.add('active');
        darkButton.classList.remove('active');
        autoButton.classList.remove('active');
    } else if (theme === 'dark') {
        darkButton.classList.add('active');
        lightButton.classList.remove('active');
        autoButton.classList.remove('active');
    } else {
        autoButton.classList.add('active');
        lightButton.classList.remove('active');
        darkButton.classList.remove('active');
    }
}


lightButton.addEventListener('click', function() {
    document.documentElement.setAttribute('data-bs-theme', 'light');
    saveTheme('light');
    setActiveButton('light');
    switchLinkTheme('light');
});


darkButton.addEventListener('click', function() {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    saveTheme('dark');
    setActiveButton('dark');
    switchLinkTheme('dark');
});


autoButton.addEventListener('click', function() {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (systemPrefersDark) {
        document.documentElement.setAttribute('data-bs-theme', 'dark');
        switchLinkTheme('dark');
    } else {
        document.documentElement.setAttribute('data-bs-theme', 'light');
        switchLinkTheme('light');
    }
    saveTheme('auto');
    setActiveButton('auto');
});



function redirLogin() {
    window.location.href = "/login";
}


function togglePassword(fieldId) {
    const passwordField = document.getElementById(fieldId);
    const icon = document.getElementById(fieldId + '-icon');

    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        icon.classList.replace('ri-eye-off-line', 'ri-eye-line');
    } else {
        passwordField.type = 'password';
        icon.classList.replace('ri-eye-line', 'ri-eye-off-line');
    }
}

function showModal(id) {
    var Modal = new bootstrap.Modal(id);
    Modal.show();
}

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
