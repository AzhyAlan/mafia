// ===========================
// Mafia Game - Main Application (Supabase Version)
// ===========================

// Game State
const gameState = {
    odx: null,
    playerName: '',
    roomCode: null,
    isHost: false,
    players: {},
    settings: {
        mafiaCount: 1,
        includeDoctor: true,
        includeDetective: true
    },
    myRole: null,
    gameStarted: false,
    subscription: null
};

// Role Definitions
const ROLES = {
    mafia: {
        name: 'Mafia',
        team: 'Mafia',
        icon: '🔪',
        description: 'Eliminate civilians at night. Work with your fellow mafia to take over the town.',
        class: 'mafia'
    },
    civilian: {
        name: 'Civilian',
        team: 'Town',
        icon: '👤',
        description: 'Find and eliminate the mafia during the day. Stay alive and vote wisely!',
        class: 'civilian'
    },
    doctor: {
        name: 'Doctor',
        team: 'Town',
        icon: '💊',
        description: 'Each night, choose one player to protect from the mafia. You can save lives!',
        class: 'doctor'
    },
    detective: {
        name: 'Detective',
        team: 'Town',
        icon: '🔍',
        description: 'Each night, investigate one player to learn if they are mafia or innocent.',
        class: 'detective'
    }
};

// DOM Elements
const screens = {
    landing: document.getElementById('landing-screen'),
    join: document.getElementById('join-screen'),
    host: document.getElementById('host-screen'),
    lobby: document.getElementById('lobby-screen'),
    waiting: document.getElementById('waiting-screen'),
    role: document.getElementById('role-screen'),
    gameReady: document.getElementById('game-ready-screen')
};

// ===========================
// Utility Functions
// ===========================

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function showScreen(screenId) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    screens[screenId].classList.add('active');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
        errorEl.textContent = message;
        setTimeout(() => {
            errorEl.textContent = '';
        }, 5000);
    }
}

// ===========================
// Particle Effects
// ===========================

function createParticles() {
    const container = document.getElementById('particles');
    const count = 30;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        container.appendChild(particle);
    }
}

// ===========================
// Supabase Database Functions
// ===========================

async function createRoom(roomCode, hostName) {
    const odx = generatePlayerId();
    gameState.odx = odx;
    gameState.playerName = hostName;
    gameState.roomCode = roomCode;
    gameState.isHost = true;

    const roomData = {
        room_code: roomCode,
        host_id: odx,
        settings: gameState.settings,
        players: {
            [odx]: {
                name: hostName,
                isHost: true,
                ready: false,
                role: null
            }
        },
        game_started: false,
        all_ready: false
    };

    const { data, error } = await supabase
        .from('rooms')
        .insert([roomData])
        .select();

    if (error) throw error;
    return data;
}

async function joinRoom(roomCode, playerName) {
    const odx = generatePlayerId();
    gameState.odx = odx;
    gameState.playerName = playerName;
    gameState.roomCode = roomCode;
    gameState.isHost = false;

    // Get current room data
    const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

    if (fetchError) throw fetchError;

    // Add player to room
    const updatedPlayers = {
        ...room.players,
        [odx]: {
            name: playerName,
            isHost: false,
            ready: false,
            role: null
        }
    };

    const { error: updateError } = await supabase
        .from('rooms')
        .update({ players: updatedPlayers })
        .eq('room_code', roomCode);

    if (updateError) throw updateError;
}

async function leaveRoom() {
    if (!gameState.roomCode || !gameState.odx) return;

    // Unsubscribe from realtime
    if (gameState.subscription) {
        supabase.removeChannel(gameState.subscription);
        gameState.subscription = null;
    }

    try {
        if (gameState.isHost) {
            // If host leaves, delete the room
            await supabase
                .from('rooms')
                .delete()
                .eq('room_code', gameState.roomCode);
        } else {
            // Remove player from room
            const { data: room } = await supabase
                .from('rooms')
                .select('players')
                .eq('room_code', gameState.roomCode)
                .single();

            if (room) {
                const updatedPlayers = { ...room.players };
                delete updatedPlayers[gameState.odx];

                await supabase
                    .from('rooms')
                    .update({ players: updatedPlayers })
                    .eq('room_code', gameState.roomCode);
            }
        }
    } catch (error) {
        console.error('Error leaving room:', error);
    }

    // Reset game state
    gameState.roomCode = null;
    gameState.odx = null;
    gameState.isHost = false;
    gameState.players = {};
    gameState.myRole = null;
    gameState.gameStarted = false;
}

async function updateSettings(settings) {
    if (!gameState.isHost || !gameState.roomCode) return;

    const { data: room } = await supabase
        .from('rooms')
        .select('settings')
        .eq('room_code', gameState.roomCode)
        .single();

    const updatedSettings = { ...room.settings, ...settings };

    await supabase
        .from('rooms')
        .update({ settings: updatedSettings })
        .eq('room_code', gameState.roomCode);
}

function distributeRoles(players, settings) {
    const playerIds = Object.keys(players);
    const totalPlayers = playerIds.length;

    // Create role array
    const roles = [];

    // Add mafia
    for (let i = 0; i < settings.mafiaCount; i++) {
        roles.push('mafia');
    }

    // Add special roles
    if (settings.includeDoctor && roles.length < totalPlayers) {
        roles.push('doctor');
    }
    if (settings.includeDetective && roles.length < totalPlayers) {
        roles.push('detective');
    }

    // Fill rest with civilians
    while (roles.length < totalPlayers) {
        roles.push('civilian');
    }

    // Shuffle roles
    for (let i = roles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // Assign roles to players
    const updatedPlayers = { ...players };
    playerIds.forEach((id, index) => {
        updatedPlayers[id] = { ...updatedPlayers[id], role: roles[index] };
    });

    return updatedPlayers;
}

async function startGame() {
    if (!gameState.isHost) return;

    const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', gameState.roomCode)
        .single();

    if (!room) return;

    const updatedPlayers = distributeRoles(room.players, room.settings);

    await supabase
        .from('rooms')
        .update({
            players: updatedPlayers,
            game_started: true
        })
        .eq('room_code', gameState.roomCode);
}

async function setPlayerReady(ready) {
    if (!gameState.roomCode || !gameState.odx) return;

    const { data: room } = await supabase
        .from('rooms')
        .select('players')
        .eq('room_code', gameState.roomCode)
        .single();

    if (!room) return;

    const updatedPlayers = { ...room.players };
    updatedPlayers[gameState.odx] = { ...updatedPlayers[gameState.odx], ready: true };

    // Check if all ready
    const allReady = Object.values(updatedPlayers).every(p => p.ready);

    await supabase
        .from('rooms')
        .update({
            players: updatedPlayers,
            all_ready: allReady
        })
        .eq('room_code', gameState.roomCode);
}

// ===========================
// Room Listeners (Realtime)
// ===========================

function listenToRoom(roomCode) {
    // Unsubscribe from previous subscription
    if (gameState.subscription) {
        supabase.removeChannel(gameState.subscription);
    }

    // Subscribe to room changes
    gameState.subscription = supabase
        .channel('room-' + roomCode)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'rooms',
                filter: `room_code=eq.${roomCode}`
            },
            (payload) => {
                if (payload.eventType === 'DELETE') {
                    showToast('Room has been closed');
                    showScreen('landing');
                    return;
                }

                handleRoomUpdate(payload.new);
            }
        )
        .subscribe();

    // Also fetch initial state
    fetchRoomState(roomCode);
}

async function fetchRoomState(roomCode) {
    const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

    if (error || !room) {
        showToast('Room not found');
        showScreen('landing');
        return;
    }

    handleRoomUpdate(room);
}

function handleRoomUpdate(room) {
    if (!room) return;

    gameState.players = room.players || {};
    gameState.settings = room.settings;

    // Update player lists
    updatePlayerList('player-list', room.players);
    updatePlayerList('waiting-player-list', room.players);

    // Update player counts
    const playerCount = Object.keys(room.players || {}).length;
    document.getElementById('player-count').textContent = `(${playerCount})`;
    document.getElementById('waiting-player-count').textContent = `(${playerCount})`;

    // Update settings UI if host
    if (gameState.isHost) {
        document.getElementById('mafia-count').textContent = room.settings.mafiaCount;
        document.getElementById('toggle-doctor').classList.toggle('active', room.settings.includeDoctor);
        document.getElementById('toggle-detective').classList.toggle('active', room.settings.includeDetective);
        updateRoleDistribution(playerCount, room.settings);
    }

    // Check if game started
    if (room.game_started && !gameState.gameStarted) {
        gameState.gameStarted = true;
        const myRole = room.players[gameState.odx]?.role;
        if (myRole) {
            gameState.myRole = myRole;
            showRoleScreen(myRole);
        }
    }

    // Check ready counts
    if (room.game_started) {
        const players = Object.values(room.players);
        const readyCount = players.filter(p => p.ready).length;
        const totalPlayers = players.length;

        document.getElementById('ready-count').textContent = readyCount;
        document.getElementById('total-players').textContent = totalPlayers;

        // Check if all ready
        if (room.all_ready) {
            showGameReadyScreen(room.players);
        }
    }
}

function updatePlayerList(listId, players) {
    const list = document.getElementById(listId);
    if (!list) return;

    list.innerHTML = '';

    Object.entries(players || {}).forEach(([id, player]) => {
        const li = document.createElement('li');
        li.textContent = player.name;
        if (player.isHost) li.classList.add('host');
        if (player.ready) li.classList.add('ready');
        list.appendChild(li);
    });
}

function updateRoleDistribution(playerCount, settings) {
    const container = document.getElementById('role-distribution');
    if (!container) return;

    const mafiaCount = settings.mafiaCount;
    let specialCount = 0;
    if (settings.includeDoctor) specialCount++;
    if (settings.includeDetective) specialCount++;

    const civilianCount = Math.max(0, playerCount - mafiaCount - specialCount);

    let html = `<span class="mafia">🔪 ${mafiaCount} Mafia</span>`;
    html += `<span class="civilian">👤 ${civilianCount} Civilian</span>`;
    if (settings.includeDoctor) html += `<span class="doctor">💊 1 Doctor</span>`;
    if (settings.includeDetective) html += `<span class="detective">🔍 1 Detective</span>`;

    container.innerHTML = html;
}

// ===========================
// Role Screen
// ===========================

function showRoleScreen(roleName) {
    showScreen('role');

    const role = ROLES[roleName];
    const card = document.getElementById('role-card');
    const cardFront = card.querySelector('.card-front');

    // Reset card
    card.classList.remove('flipped');
    document.getElementById('tap-hint').style.display = 'block';
    document.getElementById('role-actions').style.display = 'none';

    // Set role info
    document.getElementById('role-icon').textContent = role.icon;
    document.getElementById('role-title').textContent = role.name;
    document.getElementById('role-team').textContent = role.team;
    document.getElementById('role-description').textContent = role.description;

    // Set card class
    cardFront.className = 'card-face card-front ' + role.class;
}

function flipCard() {
    const card = document.getElementById('role-card');
    card.classList.toggle('flipped');

    if (card.classList.contains('flipped')) {
        document.getElementById('tap-hint').style.display = 'none';
        document.getElementById('role-actions').style.display = 'flex';
    }
}

function hideCard() {
    const card = document.getElementById('role-card');
    card.classList.remove('flipped');
    document.getElementById('tap-hint').style.display = 'block';
    document.getElementById('role-actions').style.display = 'none';
}

function showGameReadyScreen(players) {
    showScreen('gameReady');

    // Show role summary for host
    if (gameState.isHost) {
        const summary = document.getElementById('host-only-summary');
        const list = document.getElementById('roles-summary-list');

        summary.style.display = 'block';
        list.innerHTML = '';

        Object.entries(players).forEach(([id, player]) => {
            const role = ROLES[player.role];
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${player.name}</span>
                <span style="color: var(--${role.class === 'mafia' ? 'mafia-red' : role.class === 'doctor' ? 'doctor-green' : role.class === 'detective' ? 'detective-purple' : 'civilian-blue'})">${role.icon} ${role.name}</span>
            `;
            list.appendChild(li);
        });
    }
}

// ===========================
// Event Listeners
// ===========================

function setupEventListeners() {
    // Landing screen
    document.getElementById('host-btn').addEventListener('click', () => {
        showScreen('host');
    });

    document.getElementById('join-btn').addEventListener('click', () => {
        showScreen('join');
    });

    // Back buttons
    document.getElementById('join-back-btn').addEventListener('click', () => {
        showScreen('landing');
    });

    document.getElementById('host-back-btn').addEventListener('click', () => {
        showScreen('landing');
    });

    // Create room
    document.getElementById('create-room-btn').addEventListener('click', async () => {
        const nameInput = document.getElementById('player-name-host');
        const name = nameInput.value.trim();

        if (!name) {
            showToast('Please enter your name');
            return;
        }

        if (!isSupabaseConfigured()) {
            showToast('Supabase not configured. Please add your config.');
            return;
        }

        const roomCode = generateRoomCode();

        try {
            await createRoom(roomCode, name);
            document.getElementById('display-room-code').textContent = roomCode;
            listenToRoom(roomCode);
            showScreen('lobby');
            showToast('Room created!');
        } catch (error) {
            console.error('Error creating room:', error);
            showToast('Failed to create room: ' + error.message);
        }
    });

    // Join room
    document.getElementById('join-room-btn').addEventListener('click', async () => {
        const nameInput = document.getElementById('player-name-join');
        const codeInput = document.getElementById('room-code');

        const name = nameInput.value.trim();
        const code = codeInput.value.trim().toUpperCase();

        if (!name) {
            showError('join-error', 'Please enter your name');
            return;
        }

        if (!code || code.length !== 4) {
            showError('join-error', 'Please enter a valid 4-character room code');
            return;
        }

        if (!isSupabaseConfigured()) {
            showToast('Supabase not configured. Please add your config.');
            return;
        }

        // Check if room exists
        const { data: room, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('room_code', code)
            .single();

        if (error || !room) {
            showError('join-error', 'Room not found. Check the code and try again.');
            return;
        }

        if (room.game_started) {
            showError('join-error', 'Game has already started');
            return;
        }

        try {
            await joinRoom(code, name);
            listenToRoom(code);
            showScreen('waiting');
            showToast('Joined room!');
        } catch (error) {
            console.error('Error joining room:', error);
            showError('join-error', 'Failed to join room');
        }
    });

    // Copy room code
    document.getElementById('copy-code-btn').addEventListener('click', () => {
        const code = document.getElementById('display-room-code').textContent;
        navigator.clipboard.writeText(code).then(() => {
            showToast('Code copied!');
        });
    });

    // Settings controls (host only)
    document.getElementById('mafia-minus').addEventListener('click', () => {
        const current = gameState.settings.mafiaCount;
        if (current > 1) {
            gameState.settings.mafiaCount = current - 1;
            updateSettings({ mafiaCount: current - 1 });
        }
    });

    document.getElementById('mafia-plus').addEventListener('click', () => {
        const current = gameState.settings.mafiaCount;
        const maxMafia = Math.floor(Object.keys(gameState.players).length / 2);
        if (current < Math.max(maxMafia, 3)) {
            gameState.settings.mafiaCount = current + 1;
            updateSettings({ mafiaCount: current + 1 });
        }
    });

    document.getElementById('toggle-doctor').addEventListener('click', () => {
        gameState.settings.includeDoctor = !gameState.settings.includeDoctor;
        updateSettings({ includeDoctor: gameState.settings.includeDoctor });
    });

    document.getElementById('toggle-detective').addEventListener('click', () => {
        gameState.settings.includeDetective = !gameState.settings.includeDetective;
        updateSettings({ includeDetective: gameState.settings.includeDetective });
    });

    // Start game (host only)
    document.getElementById('start-game-btn').addEventListener('click', () => {
        const playerCount = Object.keys(gameState.players).length;

        if (playerCount < 3) {
            showToast('Need at least 3 players to start');
            return;
        }

        const requiredRoles = gameState.settings.mafiaCount +
            (gameState.settings.includeDoctor ? 1 : 0) +
            (gameState.settings.includeDetective ? 1 : 0);

        if (requiredRoles > playerCount) {
            showToast('Too many special roles for player count');
            return;
        }

        startGame();
    });

    // Leave game buttons
    document.getElementById('leave-game-btn').addEventListener('click', () => {
        leaveRoom();
        showScreen('landing');
    });

    document.getElementById('waiting-leave-btn').addEventListener('click', () => {
        leaveRoom();
        showScreen('landing');
    });

    // Card flip
    document.getElementById('card-container').addEventListener('click', () => {
        flipCard();
    });

    // Hide role
    document.getElementById('hide-role-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        hideCard();
    });

    // Ready button
    document.getElementById('ready-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        setPlayerReady(true);
        showToast('You are ready!');
    });

    // New game
    document.getElementById('new-game-btn').addEventListener('click', () => {
        leaveRoom();
        showScreen('landing');
    });

    // Room code input - auto uppercase
    document.getElementById('room-code').addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
}

// ===========================
// Initialization
// ===========================

function init() {
    createParticles();

    if (isSupabaseConfigured()) {
        initializeSupabase();
    } else {
        console.warn('Supabase not configured. Please update supabase-config.js with your credentials.');
    }

    setupEventListeners();

    // Handle page unload
    window.addEventListener('beforeunload', () => {
        if (gameState.roomCode) {
            leaveRoom();
        }
    });
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
