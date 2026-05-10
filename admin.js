// ==================== CHECK ADMIN ACCESS ====================
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is admin
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (!currentUser) {
        alert('Please login first!');
        window.location.href = 'login.html';
        return;
    }
    
    if (currentUser.role !== 'admin') {
        alert('Access denied! Admin privileges required.');
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Update admin name
    if (document.getElementById('adminName')) {
        document.getElementById('adminName').textContent = currentUser.name;
    }
    
    // Initialize admin panel
    initializeAdminPanel();
});

// ==================== INITIALIZE ADMIN PANEL ====================
function initializeAdminPanel() {
    console.log('✅ Admin panel initialized');
    loadDashboardData();
}

// ==================== SHOW SECTION ====================
function showAdminSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update active menu item
    document.querySelectorAll('.admin-menu a').forEach(link => {
        link.classList.remove('active');
    });
    event.target.closest('a').classList.add('active');
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard Overview',
        'users': 'User Management',
        'volunteers': 'Volunteer Management',
        'committee': 'Committee Management',
        'donations': 'Donation Management',
        'gallery': 'Gallery Management',
        'events': 'Event Management',
        'reports': 'Reports & Analytics',
        'settings': 'System Settings'
    };
    
    document.getElementById('pageTitle').textContent = titles[sectionId] || 'Admin Panel';
}

// ==================== LOAD DASHBOARD DATA ====================
function loadDashboardData() {
    // Simulate loading dashboard statistics
    console.log('📊 Loading dashboard data...');
    
    // In a real application, you would fetch this data from a server
    const dashboardData = {
        totalVolunteers: 150,
        totalDonations: 550000,
        upcomingEvents: 12,
        galleryPhotos: 245,
        recentDonations: [
            { name: 'Ramesh Patel', amount: 10000, date: '15 Sept 2024', method: 'UPI', status: 'Completed' },
            { name: 'Suresh Mehta', amount: 5000, date: '14 Sept 2024', method: 'Cash', status: 'Completed' },
            { name: 'Priya Sharma', amount: 3000, date: '14 Sept 2024', method: 'Card', status: 'Pending' }
        ]
    };
    
    return dashboardData;
}

// ==================== MODAL FUNCTIONS ====================
function openModal(modalType) {
    const modal = document.getElementById(modalType + 'Modal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalType) {
    const modal = document.getElementById(modalType + 'Modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});

// ==================== USER MANAGEMENT ====================
const addUserForm = document.getElementById('addUserForm');
if (addUserForm) {
    addUserForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            role: formData.get('role'),
            password: formData.get('password')
        };
        
        // In real application, send to server
        console.log('New user data:', userData);
        
        alert('User added successfully!');
        closeModal('addUser');
        e.target.reset();
        
        // Reload user table
        loadUsers();
    });
}

// ==================== LOAD USERS ====================
function loadUsers() {
    const userTableBody = document.getElementById('userTableBody');
    if (!userTableBody) return;
    
    // Sample user data
    const users = [
        { name: 'Rajesh Kumar', email: 'rajesh@email.com', role: 'Volunteer', status: 'Active' },
        { name: 'Amit Patel', email: 'amit@email.com', role: 'Committee', status: 'Active' },
        { name: 'Priya Sharma', email: 'priya@email.com', role: 'Volunteer', status: 'Active' }
    ];
    
    userTableBody.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="badge badge-info">${user.role}</span></td>
            <td><span class="badge badge-success">${user.status}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-edit" onclick="editUser('${user.email}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteUser('${user.email}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ==================== EDIT USER ====================
function editUser(email) {
    alert('Edit user: ' + email);
    // In real application, open edit modal with user data
}

// ==================== DELETE USER ====================
function deleteUser(email) {
    if (confirm('Are you sure you want to delete this user?')) {
        alert('User deleted: ' + email);
        // In real application, send delete request to server
        loadUsers();
    }
}

// ==================== EXPORT DATA ====================
function exportData(type) {
    alert('Exporting ' + type + ' data...');
    // In real application, generate and download CSV/PDF file
}

// ==================== GENERATE REPORT ====================
function generateReport(reportType) {
    alert('Generating ' + reportType + ' report...');
    // In real application, generate PDF report
}

// ==================== ADMIN LOGOUT ====================
function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

// ==================== SEARCH FUNCTIONALITY ====================
function searchTable(inputId, tableId) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    
    if (!input || !table) return;
    
    input.addEventListener('keyup', function() {
        const filter = input.value.toUpperCase();
        const rows = table.getElementsByTagName('tr');
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.getElementsByTagName('td');
            let found = false;
            
            for (let j = 0; j < cells.length; j++) {
                const cell = cells[j];
                if (cell) {
                    const textValue = cell.textContent || cell.innerText;
                    if (textValue.toUpperCase().indexOf(filter) > -1) {
                        found = true;
                        break;
                    }
                }
            }
            
            row.style.display = found ? '' : 'none';
        }
    });
}

// ==================== UPLOAD HANDLER ====================
function handleFileUpload(inputElement, fileType) {
    const file = inputElement.files[0];
    if (file) {
        // Validate file type
        const validTypes = {
            'image': ['image/jpeg', 'image/png', 'image/gif'],
            'document': ['application/pdf', 'application/msword'],
            'excel': ['application/vnd.ms-excel', 'text/csv']
        };
        
        if (validTypes[fileType] && !validTypes[fileType].includes(file.type)) {
            alert('Invalid file type!');
            return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB!');
            return;
        }
        
        console.log('File selected:', file.name);
        // In real application, upload to server
        alert('File uploaded successfully: ' + file.name);
    }
}

// ==================== STATISTICS UPDATE ====================
function updateStatistics() {
    // Update dashboard statistics
    const stats = {
        volunteers: 150,
        donations: 550000,
        events: 12,
        photos: 245
    };
    
    console.log('📈 Statistics updated:', stats);
}

// ==================== NOTIFICATION SYSTEM ====================
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#27AE60' : type === 'error' ? '#E74C3C' : '#3498DB'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== INITIALIZE ON LOAD ====================
console.log('🎯 Admin.js loaded successfully');
console.log('👤 Current admin:', JSON.parse(localStorage.getItem('currentUser') || '{}').name);