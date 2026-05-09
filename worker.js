const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function handleOptions() {
  return new Response(null, { headers: corsHeaders });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/telegram-auth" && request.method === "POST") {
        return await handleTelegramAuth(request, env);
      }
      if (path === "/profile" && request.method === "GET") {
        return await handleProfile(request, env);
      }
      if (path === "/watch-ad" && request.method === "POST") {
        return await handleWatchAd(request, env);
      }
      // Admin endpoints
      if (path.startsWith("/admin")) {
        return await handleAdmin(request, env);
      }

      return new Response("Not found", { status: 404, headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }
};

async function handleTelegramAuth(request, env) {
  const { tgUser } = await request.json();
  if (!tgUser || !tgUser.username) {
    // Fallback if we just test it in browser
    const username = tgUser && tgUser.id ? `user_${tgUser.id}` : `guest_${Date.now()}`;
    return createOrUpdateUser(username, env);
  }
  const username = tgUser.username;
  return createOrUpdateUser(username, env);
}

async function createOrUpdateUser(username, env) {
  const token = `${username}-${Date.now()}`;

  let user = await env.ACC_KV.get(`user:${username}`, "json");
  if (!user) {
    user = {
      username: username,
      token: token,
      date: new Date().toISOString().split("T")[0],
      ads_watched: 0,
      ads_required: 2
    };
    await env.ACC_KV.put(`user:${username}`, JSON.stringify(user));
  } else {
    user.token = token; // Update token
    await env.ACC_KV.put(`user:${username}`, JSON.stringify(user));
  }

  return new Response(JSON.stringify({ token, username }), { status: 200, headers: corsHeaders });
}

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

async function handleProfile(request, env) {
  const url = new URL(request.url);
  const username = url.searchParams.get("username");

  if (!username) {
    return new Response(JSON.stringify({ error: "Username required" }), { status: 400, headers: corsHeaders });
  }

  let user = await env.ACC_KV.get(`user:${username}`, "json");
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });
  }

  const today = getTodayString();
  if (user.date !== today) {
    user.date = today;
    user.ads_watched = 0;
    user.ads_required = 2;
    await env.ACC_KV.put(`user:${username}`, JSON.stringify(user));
  }

  return new Response(JSON.stringify({
    username: user.username,
    ads_watched: user.ads_watched,
    ads_required: user.ads_required
  }), { status: 200, headers: corsHeaders });
}

async function handleWatchAd(request, env) {
  const { username, token } = await request.json();
  let user = await env.ACC_KV.get(`user:${username}`, "json");

  if (!user || user.token !== token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const today = getTodayString();
  if (user.date !== today) {
    user.date = today;
    user.ads_watched = 0;
    user.ads_required = 2;
  }

  user.ads_watched += 1;
  let awarded_account = null;

  if (user.ads_watched >= user.ads_required) {
    // Try to get an account
    let available = await env.ACC_KV.get("accounts:available", "json") || [];
    if (available.length > 0) {
      awarded_account = available.shift(); // take the first one

      let fetched = await env.ACC_KV.get("accounts:fetched", "json") || [];
      fetched.push(awarded_account);

      await env.ACC_KV.put("accounts:available", JSON.stringify(available));
      await env.ACC_KV.put("accounts:fetched", JSON.stringify(fetched));

      // Update user progression
      user.ads_watched = 0;
      if (user.ads_required === 2) user.ads_required = 4;
      else if (user.ads_required === 4) user.ads_required = 8;
      else if (user.ads_required === 8) user.ads_required = 8; // Maxes out at 8
    } else {
      // Revert ad watch increment so they can try again when accounts are added
      user.ads_watched -= 1;
      return new Response(JSON.stringify({ error: "No accounts available at the moment. Please try again later." }), { status: 400, headers: corsHeaders });
    }
  }

  await env.ACC_KV.put(`user:${username}`, JSON.stringify(user));

  return new Response(JSON.stringify({
    success: true,
    ads_watched: user.ads_watched,
    ads_required: user.ads_required,
    awarded_account: awarded_account
  }), { status: 200, headers: corsHeaders });
}

async function handleAdmin(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  let adminSecret = request.headers.get("Authorization");
  let body = null;
  if (request.method === "POST") {
    try {
      body = await request.json();
      if (body && body.admin_secret) adminSecret = body.admin_secret;
    } catch (e) {}
  }

  if (!adminSecret) {
    adminSecret = url.searchParams.get("secret");
  }

  if (adminSecret !== "admin-secret-123") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  if (path === "/admin/stats" && request.method === "GET") {
    let available = await env.ACC_KV.get("accounts:available", "json") || [];
    let fetched = await env.ACC_KV.get("accounts:fetched", "json") || [];
    return new Response(JSON.stringify({
      available_count: available.length,
      fetched_count: fetched.length
    }), { status: 200, headers: corsHeaders });
  }

  if (path === "/admin/fetched" && request.method === "GET") {
    let fetched = await env.ACC_KV.get("accounts:fetched", "json") || [];
    return new Response(JSON.stringify({ fetched }), { status: 200, headers: corsHeaders });
  }

  if (path === "/admin/delete-fetched" && request.method === "POST") {
    const { account } = body;
    let fetched = await env.ACC_KV.get("accounts:fetched", "json") || [];
    fetched = fetched.filter(acc => acc !== account);
    await env.ACC_KV.put("accounts:fetched", JSON.stringify(fetched));
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  }

  if (path === "/admin/add-accounts" && request.method === "POST") {
    const { accounts } = body; // Array of strings
    if (!accounts || !Array.isArray(accounts)) {
      return new Response(JSON.stringify({ error: "Invalid accounts format" }), { status: 400, headers: corsHeaders });
    }
    let available = await env.ACC_KV.get("accounts:available", "json") || [];
    available.push(...accounts);
    await env.ACC_KV.put("accounts:available", JSON.stringify(available));
    return new Response(JSON.stringify({ success: true, count: available.length }), { status: 200, headers: corsHeaders });
  }

  return new Response("Admin Endpoint Not found", { status: 404, headers: corsHeaders });
}
