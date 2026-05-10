// Demo Users Database (In production, this would be server-side)
const users = [
    {
        id: 1,
        username: 'admin',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin',
        email: 'admin@patelwadiganesh.org'
    },
    {
        id: 2,
        username: 'volunteer1',
        password: 'vol123',
        name: 'Rajesh Kumar',
        role: 'volunteer',
        email: 'rajesh@email.com',
        department: 'Decoration'
    },
    {
        id: 3,
        username: 'volunteer2',
        password: 'vol123',
        name: 'Priya Sharma',
        role: 'volunteer',
        email: 'priya@email.com',
        department: 'Cultural'
    },
    {
        id: 4,
        username: 'committee1',
        password: 'com123',
        name: 'Amit Patel',
        role: 'committee',
        email: 'amit@email.com',
        position: 'Secretary'
    }
];

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        // Find user
        const user = users.find(u => 
            (u.username === username || u.email === username) && 
            u.password === password
        );
        
        if (user) {
            // Store user data
            const userData = {
                id: user.id,
                name: user.name,
                role: user.role,
                email: user.email
            };
            
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            if (remember) {
                localStorage.setItem('rememberUser', 'true');
            }
            
            showAlert('Login successful! Redirecting...', 'success');
            
            // Redirect based on role
            setTimeout(() => {
                if (user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1000);
        } else {
            showAlert('Invalid username or password!', 'error');
        }
    });
}

function showAlert(message, type) {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.className = `alert alert-${type}`;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 3000);
}

// Check if user is already logged in
function checkAuth() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser && window.location.pathname.includes('login.html')) {
        const user = JSON.parse(currentUser);
        if (user.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }
}

checkAuth();