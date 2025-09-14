// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAapqyFbDAdqZGdC34pacC_0I_-laVpVm4",
    authDomain: "inventory-59b72.firebaseapp.com",
    databaseURL: "https://inventory-59b72-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "inventory-59b72",
    storageBucket: "inventory-59b72.firebasestorage.app",
    messagingSenderId: "972932330869",
    appId: "1:972932330869:web:0fe391334fa58634474f3c"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Global variables
let currentEmployee = null;
let loginTime = null;
let productivityRecords = {};

// Make functions global
window.login = login;
window.logout = logout;
window.addProductivity = addProductivity;

async function login() {
    const employeeId = document.getElementById('employeeId').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorDiv = document.getElementById('loginError');

    if (!employeeId || !password) {
        showError('Please enter both Employee ID and Password');
        return;
    }

    try {
        // Fetch employee data from Firebase
        const employeeRef = firebase.database().ref(`employee_data/${employeeId}`);
        employeeRef.once('value').then((snapshot) => {
            if (!snapshot.exists()) {
                showError('Employee ID not found');
                return;
            }

            const employee = snapshot.val();

            if (employee.password !== password) {
                showError('Invalid password');
                return;
            }

            // Successful login
            currentEmployee = { id: employeeId, ...employee };
            loginTime = new Date();
            
            // Record login time in Firebase
            recordLoginTime(employeeId, loginTime);
            
            showDashboard();
            loadTodayRecords();
        }).catch((error) => {
            showError('Login failed. Please try again.');
            console.error('Login error:', error);
        });
        
    } catch (error) {
        showError('Login failed. Please try again.');
        console.error('Login error:', error);
    }
}

async function recordLoginTime(employeeId, time) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const loginData = {
            employeeId: employeeId,
            loginTime: time.toISOString(),
            date: today
        };
        
        const loginRef = firebase.database().ref(`attendance/${employeeId}/${today}`);
        await loginRef.set(loginData);
        
        console.log('Login time recorded:', loginData);
    } catch (error) {
        console.error('Error recording login time:', error);
    }
}

function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    
    // Populate employee info
    document.getElementById('empId').textContent = currentEmployee.id;
    document.getElementById('empName').textContent = currentEmployee.name;
    document.getElementById('empEmail').textContent = currentEmployee.email;
    document.getElementById('empRole').textContent = currentEmployee.usertype;
    document.getElementById('loginTime').textContent = loginTime.toLocaleTimeString();
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString();
    
    // Set current hour
    document.getElementById('hourInput').value = new Date().getHours();
    
    // Start time display
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
}

function updateTimeDisplay() {
    const now = new Date();
    document.getElementById('currentTime').textContent = 
        `Current Time: ${now.toLocaleString()}`;
}

async function addProductivity() {
    const hour = parseInt(document.getElementById('hourInput').value);
    const pieces = parseInt(document.getElementById('piecesInput').value);
    const taskType = document.getElementById('taskType').value;
    const messageDiv = document.getElementById('productivityMessage');

    if (isNaN(hour) || isNaN(pieces) || hour < 0 || hour > 23 || pieces < 0) {
        showMessage('Please enter valid hour (0-23) and pieces count', 'error', messageDiv);
        return;
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        const recordId = Date.now().toString();
        
        const productivityData = {
            employeeId: currentEmployee.id,
            date: today,
            hour: hour,
            pieces: pieces,
            taskType: taskType,
            recordedAt: new Date().toISOString()
        };

        // Store in Firebase
        const productivityRef = firebase.database().ref(`productivity/${currentEmployee.id}/${today}/${recordId}`);
        await productivityRef.set(productivityData);

        showMessage('Productivity record added successfully!', 'success', messageDiv);
        
        // Clear inputs
        document.getElementById('piecesInput').value = '';
        
        // Reload records
        loadTodayRecords();
        
    } catch (error) {
        showMessage('Error adding productivity record', 'error', messageDiv);
        console.error('Error:', error);
    }
}

async function loadTodayRecords() {
    const today = new Date().toISOString().split('T')[0];
    const tableBody = document.getElementById('recordsTableBody');
    tableBody.innerHTML = '';
    
    let totalPieces = 0;
    
    try {
        // Fetch today's records from Firebase
        const recordsRef = firebase.database().ref(`productivity/${currentEmployee.id}/${today}`);
        recordsRef.once('value').then((snapshot) => {
            if (snapshot.exists()) {
                const records = snapshot.val();
                
                Object.entries(records).forEach(([recordId, record]) => {
                    const row = tableBody.insertRow();
                    row.innerHTML = `
                        <td>${new Date(record.recordedAt).toLocaleTimeString()}</td>
                        <td>${record.hour}:00</td>
                        <td>${record.taskType.replace('_', ' ').toUpperCase()}</td>
                        <td>${record.pieces}</td>
                        <td>${new Date(record.recordedAt).toLocaleString()}</td>
                    `;
                    totalPieces += record.pieces;
                });
            } else {
                const row = tableBody.insertRow();
                row.innerHTML = '<td colspan="5" style="text-align: center; color: #666;">No records for today</td>';
            }
            
            document.getElementById('totalPieces').textContent = totalPieces;
        }).catch((error) => {
            console.error('Error loading records:', error);
            const row = tableBody.insertRow();
            row.innerHTML = '<td colspan="5" style="text-align: center; color: #dc3545;">Error loading records</td>';
        });
    } catch (error) {
        console.error('Error loading records:', error);
        const row = tableBody.insertRow();
        row.innerHTML = '<td colspan="5" style="text-align: center; color: #dc3545;">Error loading records</td>';
    }
}

function logout() {
    currentEmployee = null;
    loginTime = null;
    document.getElementById('employeeId').value = '';
    document.getElementById('password').value = '';
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'flex';
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showMessage(message, type, element) {
    element.textContent = message;
    element.className = type === 'error' ? 'error-message' : 'success-message';
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}