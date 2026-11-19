
import './style.css';

const app = document.querySelector('#app');

let token = localStorage.getItem('ultron_token') || '';
let username = localStorage.getItem('ultron_user') || '';

app.innerHTML = `

<main class="shell">

<header class="topbar">

<div class="brandmark">
  <img src="/ultron-logo.png" alt="ULTRON Logo">
</div>

<div>
  <div class="brand">ULTRON<span>.</span>JAILBREAK</div>
  <div class="version">V5 // AI COMMAND CENTER</div>
</div>

<div class="status"><i></i> SYSTEM READY</div>

</header>

<section class="hero">

<p class="eyebrow">PERSONAL AI ASSISTANT</p>

<h1>YOUR COMMAND.<br><span>MY INTELLIGENCE.</span></h1>

<p class="sub">A multi-provider AI workspace. Sign in to start a conversation.</p>

</section>

<section class="panel" id="auth-panel">

<div class="tabs">
<button class="tab active" data-mode="login">LOGIN</button>
<button class="tab" data-mode="register">CREATE ACCOUNT</button>
</div>

<form id="auth-form">

<label>USERNAME
<input name="username" autocomplete="username" required minlength="3" placeholder="Your username">
</label>

<label>PASSWORD
<input name="password" type="password" autocomplete="current-password" required minlength="8" placeholder="At least 8 characters">
</label>

<button class="primary" type="submit" id="auth-submit">
ACCESS SYSTEM <span>↗</span>
</button>

<p class="hint" id="auth-hint">Sign in with your account.</p>

</form>

</section>

<section class="panel chat-panel hidden" id="chat-panel">

<div class="chat-head">
<div><b>NEURAL CHAT</b><small id="signed-in"></small></div>
<button class="ghost" id="logout">LOG OUT</button>
</div>

<div id="messages" class="messages">
<div class="welcome">ULTRON online. What can I help you with?</div>
</div>

<form id="chat-form" class="composer">
<textarea id="prompt" rows="2" placeholder="Ask ULTRON anything..." required></textarea>
<button class="primary send" type="submit">SEND ↗</button>
</form>

<p class="hint">Connect and configure an AI provider on your backend before chatting.</p>

</section>

<footer>ULTRON.JAILBREAK V5 <span>•</span> PRIVATE AI WORKSPACE</footer>

</main>`;

let mode = 'login';

const authPanel = document.querySelector('#auth-panel');
const chatPanel = document.querySelector('#chat-panel');

const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');

function showChat() {
  authPanel.classList.add('hidden');
  chatPanel.classList.remove('hidden');

  document.querySelector('#signed-in').textContent = `SIGNED IN AS ${username}`;
}

if (token && username) showChat();

document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {

  mode = btn.dataset.mode;

  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === btn));

  document.querySelector('#auth-submit').innerHTML =
    mode === 'login' ? 'ACCESS SYSTEM <span>↗</span>' : 'CREATE ACCOUNT <span>↗</span>';

  document.querySelector('#auth-hint').textContent =
    mode === 'login' ? 'Sign in with your account.' : 'Create a standard user account.';

}));

document.querySelector('#auth-form').addEventListener('submit', async e => {

  e.preventDefault();

  const data = Object.fromEntries(new FormData(e.currentTarget));
  const hint = document.querySelector('#auth-hint');

  hint.textContent = 'Connecting...';

  try {

    const res = await fetch(`${apiBase}/api/auth/${mode}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });

    const body = await res.json();

    if (!res.ok) throw new Error(body.error || 'Authentication failed');

    token = body.token;
    username = body.user.username;

    localStorage.setItem('ultron_token', token);
    localStorage.setItem('ultron_user', username);

    showChat();

  } catch (err) {
    hint.textContent = `${err.message}. Check the backend URL and deployment.`;
  }

});

document.querySelector('#logout').addEventListener('click', () => {

  token = '';
  username = '';

  localStorage.removeItem('ultron_token');
  localStorage.removeItem('ultron_user');

  chatPanel.classList.add('hidden');
  authPanel.classList.remove('hidden');

});

document.querySelector('#chat-form').addEventListener('submit', async e => {

  e.preventDefault();

  const input = document.querySelector('#prompt');
  const text = input.value.trim();

  if (!text) return;

  const messages = document.querySelector('#messages');

  const userBubble = document.createElement('div');
  userBubble.className = 'bubble user';
  userBubble.textContent = text;
  messages.append(userBubble);

  input.value = '';

  const reply = document.createElement('div');
  reply.className = 'bubble bot';
  reply.textContent = 'Thinking...';
  messages.append(reply);

  messages.scrollTop = messages.scrollHeight;

  try {

    const res = await fetch(`${apiBase}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Authorization':`Bearer ${token}`
      },
      body: JSON.stringify({message:text})
    });

    const body = await res.json();

    if (!res.ok) throw new Error(body.error || 'Chat request failed');

    reply.textContent = body.reply;

  } catch (err) {
    reply.textContent = `Error: ${err.message}`;
  }

  messages.scrollTop = messages.scrollHeight;

});
