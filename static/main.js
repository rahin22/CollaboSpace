// Onload Events
window.onload = function() {
    const currentURL = window.location.href;
    const navLinks = document.querySelectorAll('.sidebar-pills a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        link.classList.add('link-dark');
    });
    
    navLinks.forEach(link => {
        if (link.href === currentURL) {
            link.classList.add('active');
            
        }
    });

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

    updateSidebarVisibility();
}

// Bootstrap Tooltips
const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))





// Theme Switcher -------------------------------------------------------------------------------------------------------------------------
const lightButtons = document.querySelectorAll('.light-button');
const darkButtons = document.querySelectorAll('.dark-button');
const autoButtons = document.querySelectorAll('.auto-button');
const themeIcon = document.getElementById('theme-logo-icon');

// Theme Link Switcher
function switchLinkTheme(theme) {
    const links = document.querySelectorAll('.link-dark');
    const lightLinks = document.querySelectorAll('.link-light');
    if (theme === 'dark') {
        links.forEach(link => {
            link.classList.remove('link-dark');
            link.classList.add('link-light');
        });
        document.documentElement.style.setProperty('--search-bar-color', '#2d3338');
    } else {
        lightLinks.forEach(link => {
            link.classList.remove('link-light');
            link.classList.add('link-dark');
        });
        document.documentElement.style.setProperty('--search-bar-color', '#e9e7e7');
    }
}

// Theme Preference Saver
function saveTheme(theme) {
    localStorage.setItem('theme', theme);
}

// Theme Icon Updater
function updateThemeIcon(theme) {
    if (theme === 'light') {
        themeIcon.classList = 'ri-sun-line fs-4';
    } else if (theme === 'dark') {
        themeIcon.classList = 'ri-moon-line fs-4';
    } else {
        themeIcon.classList = 'ri-contrast-2-fill fs-4';
    }
}

// Active Button Setter
function setActiveButton(theme) {
    if (theme === 'light') {
        lightButtons.forEach(btn => btn.classList.add('active'));
        darkButtons.forEach(btn => btn.classList.remove('active'));
        autoButtons.forEach(btn => btn.classList.remove('active'));
    } else if (theme === 'dark') {
        darkButtons.forEach(btn => btn.classList.add('active'));
        lightButtons.forEach(btn => btn.classList.remove('active'));
        autoButtons.forEach(btn => btn.classList.remove('active'));
    } else {
        autoButtons.forEach(btn => btn.classList.add('active'));
        lightButtons.forEach(btn => btn.classList.remove('active'));
        darkButtons.forEach(btn => btn.classList.remove('active'));
    }
    updateThemeIcon(theme);
}

// Light Button Event Listener
lightButtons.forEach(button => {
    button.addEventListener('click', function() {
        document.documentElement.setAttribute('data-bs-theme', 'light');
        saveTheme('light');
        setActiveButton('light');
        switchLinkTheme('light');
    });
});

// Dark Button Event Listener
darkButtons.forEach(button => {
    button.addEventListener('click', function() {
        document.documentElement.setAttribute('data-bs-theme', 'dark');
        saveTheme('dark');
        setActiveButton('dark');
        switchLinkTheme('dark');
    });
});

// Auto Button Event Listener
autoButtons.forEach(button => {
    button.addEventListener('click', function() {
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
});

// Theme Switcher -------------------------------------------------------------------------------------------------------------------------




// Password Toggle
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

// Modal Display
function showModal(id) {
    var Modal = new bootstrap.Modal(id);
    Modal.show();
}


// Sidebar Functions -------------------------------------------------------------------------------------------------------------------------

// Show Sidebar Buttons
function showButton(state) {
    const button = document.getElementById('open-button');
    if (state === 'visible') {
        button.style.visibility = 'visible';
        button.style.opacity = '1';
    } else if (state === 'hidden') {
        button.style.visibility = 'hidden';
        button.style.opacity = '0';  
    }
}

// Show Close Button
function showCloseButton(state) {
    const button = document.getElementById('close-button');
    if (state === 'visible') {
        button.style.visibility = 'visible';
        button.style.opacity = '1'; 
    } else if (state === 'hidden') {
        button.style.visibility = 'hidden';
        button.style.opacity = '0'; 
    }
}

// Open Sidebar
function openNav() {
    const smallNav = document.getElementById('smallSidebar')
    const largeNav = document.getElementById('sidebar')
    const button = document.getElementById('open-button')
    const content = document.getElementById('content')
    const navLinks = document.querySelectorAll('#sidebar a, #sidebar ul, #sidebar .dropdown, .form-header');
    const smallNavLinks = document.querySelectorAll('#smallSidebar a, #smallSidebar ul, #smallSidebar .dropdown');

    smallNavLinks.forEach(link => {
        link.style.opacity = '0';
        link.style.transition = 'opacity 0.3s ease';
    });

    largeNav.style.overflow = '';   
    smallNav.style.visibility = 'hidden';
    largeNav.style.visibility = 'visible';
    button.style.visibility = 'hidden';
    content.style.marginLeft = '280px';
    largeNav.style.width = '280px';
    

    setTimeout(() => {
        navLinks.forEach(link => {
            link.style.opacity = '1 ';
            link.style.transition = 'opacity 0.3s ease';
        });

        document.querySelectorAll('.large-nav-divider').forEach(div => {
            div.style.opacity = '0.25';
            div.style.transition = 'opacity 0.3s ease';
        });
    }, 500);

    localStorage.setItem('navbarState', 'expanded');
    
}


// Close Sidebar
function closeNav() {
    const largeNav = document.getElementById('sidebar');
    const smallNav = document.getElementById('smallSidebar');
    const navLinks = document.querySelectorAll('#sidebar a, #sidebar ul, #sidebar .dropdown, .form-header, .large-nav-divider');
    const smallNavLinks = document.querySelectorAll('#smallSidebar a, #smallSidebar ul, #smallSidebar .dropdown');
    const button = document.getElementById('close-button');
    const content = document.getElementById('content');
    
    navLinks.forEach(link => {
        link.style.opacity = '0';
        link.style.transition = 'opacity 0.3s ease';
    });

    setTimeout(() => {
        largeNav.style.overflow = 'hidden';
        largeNav.style.width = '4.5rem'; 
        content.style.marginLeft = '80px';
        button.style.visibility = 'hidden';
    }, 300); 

    setTimeout(() => {
        smallNav.style.visibility = 'visible'; 
    }, 700);;


    setTimeout(() => {
        largeNav.style.visibility = 'hidden'; 
        smallNavLinks.forEach(link => {
            link.style.opacity = '1';
            link.style.transition = 'opacity 0.3s ease';
        });
    }, 700);;

    localStorage.setItem('navbarState', 'collapsed');
}

function updateSidebarVisibility() {
    const largeNav = document.getElementById('sidebar');
    const smallNav = document.getElementById('smallSidebar');
    const navLinks = document.querySelectorAll('#sidebar a, #sidebar ul, #sidebar .dropdown, .form-header, .large-nav-divider');
    const smallNavLinks = document.querySelectorAll('#smallSidebar a, #smallSidebar ul, #smallSidebar .dropdown');
    const button = document.getElementById('close-button');
    const content = document.getElementById('content');
    const navbarState = localStorage.getItem('navbarState');


    if (navbarState === 'collapsed') {
        largeNav.style.visibility = 'hidden'; 
        smallNav.style.visibility = 'visible';
        smallNavLinks.forEach(link => {
            link.style.opacity = '1';
            link.style.transition = 'opacity 0.3s ease';
        });
        content.style.marginLeft = '80px';
    } else {
        largeNav.style.visibility = 'visible';
        smallNav.style.visibility = 'hidden';
    }
}

// Sidebar Functions -------------------------------------------------------------------------------------------------------------------------

function redirHome() {
    window.location.href = "/";
}

function redirLogin() {
    window.location.href = "/login";
}

