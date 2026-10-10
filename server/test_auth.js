const http = require('http');

async function testAuth() {
  const registerBody = JSON.stringify({
    email: `test_${Date.now()}@bhopal.gov.in`,
    password: 'securepass123',
    fullName: 'Test Officer',
    role: 'officer',
    department: 'BMC'
  });

  const registerRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: registerBody
  });

  const registerData = await registerRes.json();
  console.log('--- Register Response ---');
  console.log(registerData);

  if (!registerData.token) {
    console.error('Test Failed: No token on register');
    return;
  }

  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: registerData.email,
      password: 'securepass123'
    })
  });

  const loginData = await loginRes.json();
  console.log('\n--- Login Response ---');
  console.log(loginData);

  const meRes = await fetch('http://localhost:5000/api/auth/me', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });

  const meData = await meRes.json();
  console.log('\n--- Me (Session) Response ---');
  console.log(meData);
}

testAuth();
