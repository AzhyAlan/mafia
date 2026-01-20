# Mafia Party Game

A web-based Mafia party game where players can host/join games and view their secret role cards on their devices.

## 🎮 Features

- **Host or Join Games** - Create a room with a 4-character code, share it with friends
- **Configurable Settings** - Adjust number of mafia, include/exclude Doctor and Detective
- **Secret Role Cards** - Each player sees only their own role with a satisfying card flip animation
- **Real-time Sync** - All players see updates instantly via Supabase

## 🚀 Quick Start

### 1. Set Up Supabase (Free)

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **"New Project"**
3. Give it a name (e.g., `mafia-game`) and set a database password
4. Wait for the project to be created (~2 minutes)

### 2. Create the Database Table

1. In your Supabase project, go to **SQL Editor**
2. Click **"New Query"**
3. Paste and run this SQL:

```sql
-- Create the rooms table
CREATE TABLE rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_code TEXT UNIQUE NOT NULL,
    host_id TEXT NOT NULL,
    settings JSONB DEFAULT '{"mafiaCount": 1, "includeDoctor": true, "includeDetective": true}',
    players JSONB DEFAULT '{}',
    game_started BOOLEAN DEFAULT false,
    all_ready BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable realtime for the rooms table
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- Allow public access (for the game to work)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on rooms" ON rooms
    FOR ALL USING (true) WITH CHECK (true);
```

### 3. Get Your API Keys

1. Go to **Project Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** (starts with `https://`)
   - **anon public** key (under "Project API keys")

### 4. Configure the Game

Open `supabase-config.js` and paste your values:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 5. Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push these files to the repo
3. Go to Settings → Pages
4. Select "Deploy from a branch" → "main" → "/ (root)"
5. Your game will be live at `https://yourusername.github.io/repo-name`

## 🎭 Roles

| Role | Team | Ability |
|------|------|---------|
| Civilian | Town | Vote to eliminate mafia |
| Doctor | Town | Protect one player each night |
| Detective | Town | Investigate one player each night |
| Mafia | Mafia | Eliminate civilians at night |

## 📱 How to Play

1. **Host** creates a game and shares the 4-character room code
2. **Players** join using the room code
3. **Host** adjusts settings (number of mafia, special roles)
4. **Host** starts the game when everyone has joined
5. Each player taps their card to reveal their secret role
6. Once everyone is ready, play Mafia in person!

## 🛠️ Local Development

Just open `index.html` in a browser. For testing multiplayer, you'll need:
- Supabase configured
- Multiple browser windows/devices

## 📁 Files

```
mafia/
├── index.html          # Main HTML structure
├── style.css           # All styling
├── app.js              # Game logic
├── supabase-config.js  # Supabase configuration
└── README.md           # This file
```

## License

MIT - Feel free to modify and use!
