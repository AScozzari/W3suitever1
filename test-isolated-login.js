// Test login Brand Interface ISOLATO su porta 5001
const testIsolatedLogin = async () => {
  console.log("🔍 Testing ISOLATED Brand Interface Login on Port 5001...");
  
  try {
    // Test login su Brand Interface isolato (porta 5001)
    const loginResponse = await fetch('http://localhost:5001/brand-api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5001'  // Origin corretto per isolamento
      },
      body: JSON.stringify({
        email: "brand.superadmin@windtre.it",
        password: "Brand123!"
      })
    });

    console.log("📊 Status:", loginResponse.status);
    console.log("📊 Headers:", Object.fromEntries(loginResponse.headers.entries()));
    
    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      console.error("❌ Login failed:", error);
      return false;
    }

    const data = await loginResponse.json();
    console.log("✅ Success:", data.success);
    console.log("🔑 Token:", !!data.token);
    console.log("👤 User:", {
      email: data.user?.email,
      role: data.user?.role,
      permissions: data.user?.permissions?.length || 0
    });

    // Test che frontend sia raggiungibile su porta isolata
    const frontendResponse = await fetch('http://localhost:5001/brandinterface/');
    console.log("🖼️ Frontend Status:", frontendResponse.status);
    
    if (data.success && data.token && data.user && frontendResponse.ok) {
      console.log("🎉 ISOLATED LOGIN TEST: COMPLETE SUCCESS");
      console.log("📱 Access: http://localhost:5001/brandinterface/login");
      return true;
    } else {
      console.log("❌ TEST FAILED");
      return false;
    }

  } catch (error) {
    console.error("💥 NETWORK ERROR:", error.message);
    return false;
  }
};

// Esegui test
testIsolatedLogin().then(success => {
  console.log(success ? "✅ ISOLATION COMPLETE" : "❌ ISOLATION FAILED");
  process.exit(success ? 0 : 1);
});