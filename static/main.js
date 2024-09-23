function redirHome() {
    window.location.href = "/";
}

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
