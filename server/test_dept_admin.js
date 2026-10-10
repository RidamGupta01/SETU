

async function testDeptAdmin() {
  const ts = Date.now();
  const registerRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `admin_${ts}@bhopal.gov.in`,
      password: 'password123',
      fullName: 'Test Dept Admin',
      role: 'dept_admin',
      department: 'BMC'
    })
  });
  
  const regData = await registerRes.json();
  console.log('Registration:', regData);

  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `admin_${ts}@bhopal.gov.in`,
      password: 'password123'
    })
  });

  const loginData = await loginRes.json();
  console.log('Login:', loginData);
}

testDeptAdmin();
