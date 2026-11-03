import axios from 'axios';

const testLogin = async () => {
    try {
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@admin.com',
            password: 'password123'
        });
        console.log('Login successful:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Login failed:', error.response.status, error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
};

testLogin();
