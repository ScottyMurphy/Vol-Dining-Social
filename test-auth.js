const BASE_URL = "http://localhost:4000";

let passed = 0;
let failed = 0;

function pass(name) {
  passed++;
  console.log(`PASS: ${name}`);
}

function fail(name, message) {
  failed++;
  console.error(`FAIL: ${name}`);
  console.error(`      ${message}`);
}

async function test(name, callback) {
  try {
    await callback();
    pass(name);
  } catch (error) {
    fail(name, error.message);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    // Ignore non-JSON responses.
  }

  return {
    response,
    data,
  };
}

async function runTests() {
  console.log("\n==============================");
  console.log(" Vol Dining Auth Test Suite");
  console.log("==============================\n");

  // Use a unique email so the signup test can be rerun.
  const email =
    `authtest${Date.now()}@vols.utk.edu`;

  const password = "TestPassword123";

  let token = null;

  await test("Signup rejects non-UTK email", async () => {
    const { response } = await request("/api/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "student@gmail.com",
        password,
      }),
    });

    if (response.status !== 403) {
      throw new Error(
        `Expected 403, got ${response.status}`
      );
    }
  });

  await test("Signup rejects short password", async () => {
    const { response } = await request("/api/signup", {
      method: "POST",
      body: JSON.stringify({
        email:
          `short${Date.now()}@vols.utk.edu`,
        password: "123",
      }),
    });

    if (response.status !== 400) {
      throw new Error(
        `Expected 400, got ${response.status}`
      );
    }
  });

  await test("Signup creates UTK account", async () => {
    const { response, data } = await request(
      "/api/signup",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    if (response.status !== 201) {
      throw new Error(
        `Expected 201, got ${response.status}: ${
          data?.error || ""
        }`
      );
    }

    if (data.email !== email) {
      throw new Error(
        `Expected email ${email}, got ${data.email}`
      );
    }

    if (!data.id) {
      throw new Error(
        "Signup response did not include user id"
      );
    }
  });

  await test("Duplicate signup is rejected", async () => {
    const { response } = await request("/api/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (response.status !== 409) {
      throw new Error(
        `Expected 409, got ${response.status}`
      );
    }
  });

  await test("Login rejects wrong password", async () => {
    const { response } = await request("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: "WrongPassword123",
      }),
    });

    if (response.status !== 401) {
      throw new Error(
        `Expected 401, got ${response.status}`
      );
    }
  });

  await test("Login rejects non-UTK email", async () => {
    const { response } = await request("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email: "student@gmail.com",
        password,
      }),
    });

    if (response.status !== 403) {
      throw new Error(
        `Expected 403, got ${response.status}`
      );
    }
  });

  await test("Login succeeds", async () => {
    const { response, data } = await request(
      "/api/login",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    if (response.status !== 200) {
      throw new Error(
        `Expected 200, got ${response.status}: ${
          data?.error || ""
        }`
      );
    }

    if (!data.token) {
      throw new Error(
        "Login response did not include token"
      );
    }

    if (data.user?.email !== email) {
      throw new Error(
        "Login returned wrong user"
      );
    }

    token = data.token;
  });

  await test("/me rejects missing token", async () => {
    const { response } = await request("/api/me");

    if (response.status !== 401) {
      throw new Error(
        `Expected 401, got ${response.status}`
      );
    }
  });

  await test("/me rejects invalid token", async () => {
    const { response } = await request("/api/me", {
      headers: {
        Authorization:
          "Bearer definitely-not-a-real-token",
      },
    });

    if (response.status !== 401) {
      throw new Error(
        `Expected 401, got ${response.status}`
      );
    }
  });

  await test("/me accepts valid token", async () => {
    if (!token) {
      throw new Error(
        "No token available from login test"
      );
    }

    const { response, data } = await request("/api/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(
        `Expected 200, got ${response.status}`
      );
    }

    if (data.user?.email !== email) {
      throw new Error(
        `Expected ${email}, got ${data.user?.email}`
      );
    }
  });

  console.log("\n==============================");
  console.log(" Test Results");
  console.log("==============================");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);
  console.log("==============================\n");

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runTests();