CREATE TABLE IF NOT EXISTS prefixes (guild_id BIGINT PRIMARY KEY,prefix TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS selfprefix (user_id BIGINT PRIMARY KEY,prefix TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS aliases (guild_id BIGINT NOT NULL,command TEXT NOT NULL,alias TEXT NOT NULL,args TEXT);
CREATE TABLE IF NOT EXISTS selfaliases (user_id BIGINT NOT NULL,command TEXT NOT NULL,alias TEXT NOT NULL,args TEXT);
CREATE TABLE IF NOT EXISTS modules (guild_id BIGINT PRIMARY KEY,suggestion BOOLEAN DEFAULT FALSE,starboard BOOLEAN DEFAULT FALSE,clownboard BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS command_stats (command TEXT NOT NULL,user_id BIGINT NOT NULL,guild_id BIGINT,channel_id BIGINT,execution_time REAL,timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS command_history (command TEXT NOT NULL,arguments TEXT,server_id BIGINT,user_id BIGINT NOT NULL,channel_id BIGINT,timestamp REAL);
CREATE TABLE IF NOT EXISTS error_codes (code TEXT PRIMARY KEY,info TEXT);
CREATE TABLE IF NOT EXISTS blacklist_user (user_id BIGINT PRIMARY KEY,moderator_id BIGINT NOT NULL,duration BIGINT,reason TEXT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS blacklist_server (guild_id BIGINT PRIMARY KEY,moderator_id BIGINT NOT NULL,duration BIGINT,reason TEXT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS globalban (user_id BIGINT PRIMARY KEY,reason TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS authorized (owner_id BIGINT NOT NULL,guild_id BIGINT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS beta_testers (user_id BIGINT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS embeds_creator (user_id BIGINT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS vouches (id INT PRIMARY KEY,user_id BIGINT,message TEXT,created REAL);
CREATE TABLE IF NOT EXISTS whitelist (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (guild_id,user_id)
);CREATE TABLE IF NOT EXISTS whitelist_module (guild_id BIGINT NOT NULL, module TEXT NOT NULL, embed TEXT DEFAULT 'default', punishment TEXT DEFAULT 'kick');
CREATE TABLE IF NOT EXISTS team_members (user_id BIGINT PRIMARY KEY,role TEXT,rank TEXT,socials TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS premium (guild_id BIGINT PRIMARY KEY,user_id BIGINT NOT NULL,timestamp REAL NOT NULL,transfers INT DEFAULT 0);
CREATE TABLE IF NOT EXISTS donor (user_id BIGINT PRIMARY KEY,timestamp REAL NOT NULL,status TEXT);
CREATE TABLE IF NOT EXISTS fake_perms (guild_id BIGINT NOT NULL,role_id BIGINT NOT NULL,perms TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS global_disabled_commands (command TEXT PRIMARY KEY,status BOOLEAN DEFAULT FALSE,user BIGINT,reason TEXT,timestamp REAL);
CREATE TABLE IF NOT EXISTS blacklist_command (user_id BIGINT NOT NULL,moderator_id BIGINT NOT NULL,command TEXT NOT NULL,duration BIGINT,reason TEXT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS blacklist_command_server (guild_id BIGINT NOT NULL,moderator_id BIGINT NOT NULL,command TEXT NOT NULL,duration BIGINT,reason TEXT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS blacklist_cog (user_id BIGINT NOT NULL,moderator_id BIGINT NOT NULL,cog TEXT NOT NULL,duration BIGINT,reason TEXT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS blacklist_cog_server (guild_id BIGINT NOT NULL,moderator_id BIGINT NOT NULL,cog TEXT NOT NULL,duration BIGINT,reason TEXT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS global_beta_commands (command TEXT PRIMARY KEY,status BOOLEAN DEFAULT FALSE,user BIGINT,timestamp REAL);
CREATE TABLE IF NOT EXISTS guild_disabled_commands (
    guild_id BIGINT NOT NULL,
    cmd TEXT NOT NULL,
    PRIMARY KEY (guild_id,cmd)
);
CREATE TABLE IF NOT EXISTS guild_disabled_module (guild_id BIGINT PRIMARY KEY,module TEXT);
CREATE TABLE IF NOT EXISTS channel_disabled_commands (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,cmd TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS restrictcommand (guild_id BIGINT NOT NULL,command TEXT NOT NULL,role_id BIGINT);
CREATE TABLE IF NOT EXISTS restrictmodule (guild_id BIGINT NOT NULL,module TEXT NOT NULL,role_id BIGINT);
CREATE TABLE IF NOT EXISTS logging (
    guild_id BIGINT PRIMARY KEY,
    messages BIGINT,
    guild BIGINT,
    roles BIGINT,
    channels BIGINT,
    members BIGINT,
    moderation BIGINT,
    voice BIGINT,
    ignored_channels TEXT DEFAULT '[]',
    ignored_users TEXT DEFAULT '[]',
    ignored_roles TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS boost (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,message TEXT);
CREATE TABLE IF NOT EXISTS bumpreminder (guild_id BIGINT PRIMARY KEY,thankyou TEXT,reminder TEXT,time TIMESTAMP,channel_id BIGINT,user_id BIGINT);
CREATE TABLE IF NOT EXISTS bumpreminder_leaderboard (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    bumps INT DEFAULT 0,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS revive (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,timeout INT NOT NULL,last_message REAL NOT NULL,last_revive BIGINT,message TEXT);
CREATE TABLE IF NOT EXISTS autopublish (channel_id BIGINT PRIMARY KEY,guild_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS autothread (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    PRIMARY KEY (guild_id,channel_id)
);
CREATE TABLE IF NOT EXISTS stickymessage (
    channel_id BIGINT NOT NULL,
    guild_id BIGINT NOT NULL,
    last_message_id BIGINT,
    content TEXT,
    embed TEXT,
    not_delete BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (guild_id,channel_id)
);
CREATE TABLE IF NOT EXISTS welcome (guild_id BIGINT NOT NULL,channel_id BIGINT PRIMARY KEY,message TEXT NOT NULL,"delete" BOOLEAN DEFAULT FALSE,duration INT);
CREATE TABLE IF NOT EXISTS leave (guild_id BIGINT NOT NULL,channel_id BIGINT PRIMARY KEY,message TEXT NOT NULL,"delete" BOOLEAN DEFAULT FALSE,duration INT);
CREATE TABLE IF NOT EXISTS joindm (guild_id BIGINT PRIMARY KEY,message TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS welcome_messages (guild_id BIGINT NOT NULL,user_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,message_id BIGINT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS autorole (guild_id BIGINT NOT NULL,role_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS autorole_humans (guild_id BIGINT NOT NULL,role_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS autorole_bots (guild_id BIGINT NOT NULL,role_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS reactionrole (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,message_id BIGINT NOT NULL,emoji TEXT NOT NULL,role_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS autoresponder (
    guild_id BIGINT NOT NULL,
    "trigger" TEXT NOT NULL,
    response TEXT
);
CREATE TABLE IF NOT EXISTS autoresponder_permissions (
    guild_id BIGINT NOT NULL,
    "trigger" TEXT NOT NULL,
    state TEXT,
    data TEXT
);
CREATE TABLE IF NOT EXISTS autoreact (guild_id BIGINT NOT NULL,"trigger" TEXT NOT NULL,reactions TEXT);
CREATE TABLE IF NOT EXISTS autoreact_channel (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,reactions TEXT);
CREATE TABLE IF NOT EXISTS timer (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,"interval" INT NOT NULL,code TEXT NOT NULL,time REAL NOT NULL);
CREATE TABLE IF NOT EXISTS button_message (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,message_id BIGINT NOT NULL,button_id TEXT NOT NULL,embed TEXT NOT NULL,label TEXT,emoji TEXT);
CREATE TABLE IF NOT EXISTS invite_message (guild_id BIGINT NOT NULL,message TEXT);
CREATE TABLE IF NOT EXISTS force_nick (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    nickname TEXT NOT NULL,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS only_bot (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    PRIMARY KEY (guild_id,channel_id)
);
CREATE TABLE IF NOT EXISTS only_img (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    PRIMARY KEY (guild_id,channel_id)
);
CREATE TABLE IF NOT EXISTS only_link (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    PRIMARY KEY (guild_id,channel_id)
);
CREATE TABLE IF NOT EXISTS only_text (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    PRIMARY KEY (guild_id,channel_id)
);
CREATE TABLE IF NOT EXISTS lock (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    PRIMARY KEY (guild_id,channel_id)
);
CREATE TABLE IF NOT EXISTS lockdown_channel (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    PRIMARY KEY (guild_id,channel_id)
);
CREATE TABLE IF NOT EXISTS lockdown_role (
    guild_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (guild_id,role_id)
);
CREATE TABLE IF NOT EXISTS voiceban (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    moderator_id BIGINT,
    timestamp REAL,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS antinuke (
    guild_id BIGINT PRIMARY KEY,
    configured TEXT DEFAULT 'false',
    owner_id BIGINT,
    logs BIGINT,
    whitelisted TEXT DEFAULT '[]',
    whitelisted_roles TEXT DEFAULT '[]',
    admins TEXT DEFAULT '[]',
    staffs TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS antinuke_modules (
    guild_id BIGINT NOT NULL,
    module TEXT NOT NULL,
    punishment TEXT,
    threshold INT,
    PRIMARY KEY (guild_id,module)
);
CREATE TABLE IF NOT EXISTS antinuke_roles (
    guild_id BIGINT PRIMARY KEY,
    roles TEXT DEFAULT '[]',
    status BOOLEAN DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS antinuke_linksedit (guild_id BIGINT NOT NULL,users TEXT,channels TEXT,roles TEXT);
CREATE TABLE IF NOT EXISTS antiraid (
    guild_id BIGINT PRIMARY KEY,
    configured TEXT DEFAULT 'false',
    logs BIGINT,
    whitelisted TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS antiraid_age (guild_id BIGINT NOT NULL,punishment TEXT NOT NULL,threshold INT NOT NULL);
CREATE TABLE IF NOT EXISTS antiraid_avatar (guild_id BIGINT NOT NULL,punishment TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS antiraid_massjoin (guild_id BIGINT NOT NULL,punishment TEXT NOT NULL,threshold INT NOT NULL);
CREATE TABLE IF NOT EXISTS nuke_scheduler (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,message TEXT,timestamp REAL,schedule INT DEFAULT 0,last_nuke REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS thread_watcher (guild_id BIGINT PRIMARY KEY,state BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS appeals (guild_id BIGINT PRIMARY KEY,channel_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS hardban (guild_id BIGINT NOT NULL,user_id BIGINT NOT NULL,reason TEXT,moderator_id BIGINT,PRIMARY KEY (guild_id,user_id));
CREATE TABLE IF NOT EXISTS automod_rules (guild_id BIGINT NOT NULL,rule_id BIGINT NOT NULL,mode TEXT NOT NULL,PRIMARY KEY (guild_id,mode));
CREATE TABLE IF NOT EXISTS automod_spam (guild_id BIGINT PRIMARY KEY,rate INT DEFAULT 8,timeout INT DEFAULT 120,message BOOLEAN DEFAULT FALSE,users TEXT,channels TEXT,roles TEXT);
CREATE TABLE IF NOT EXISTS automod_repeat (guild_id BIGINT PRIMARY KEY,rate INT DEFAULT 5,timeout INT DEFAULT 120,message BOOLEAN DEFAULT FALSE,users TEXT,channels TEXT,roles TEXT);
CREATE TABLE IF NOT EXISTS vape (guild_id BIGINT PRIMARY KEY,user_id BIGINT NOT NULL,hits INT DEFAULT 0);
CREATE TABLE IF NOT EXISTS smoke (user_id BIGINT PRIMARY KEY,hits INT DEFAULT 0);
CREATE TABLE IF NOT EXISTS quotes (guild_id BIGINT PRIMARY KEY,channel_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS pingtimeout (guild_id BIGINT NOT NULL,role_id BIGINT NOT NULL,timeout INT DEFAULT 0,last_ping REAL);
CREATE TABLE IF NOT EXISTS safemode (guild_id BIGINT PRIMARY KEY,safemode BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS restore (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    roles TEXT NOT NULL,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS restore_antinuke (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    roles TEXT NOT NULL,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS history (id INT PRIMARY KEY,guild_id INT NOT NULL,user_id BIGINT NOT NULL,moderator_id BIGINT NOT NULL,server_id BIGINT NOT NULL,punishment TEXT NOT NULL,duration TEXT,reason TEXT NOT NULL,time REAL NOT NULL,proof TEXT,appeal_msg TEXT,appeal_msg_id BIGINT,appeal_id BIGINT);CREATE TABLE IF NOT EXISTS jail (guild_id BIGINT PRIMARY KEY, role_id BIGINT NOT NULL, channel_id BIGINT);
CREATE TABLE IF NOT EXISTS jail_members (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    roles TEXT,
    jailed_at TIMESTAMP,
    expires TIMESTAMP,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS mute_images (guild_id BIGINT NOT NULL,channel_id BIGINT,image TEXT);
CREATE TABLE IF NOT EXISTS mute_reactions (guild_id BIGINT NOT NULL,channel_id BIGINT,reaction TEXT);
CREATE TABLE IF NOT EXISTS invoke_message (guild_id BIGINT NOT NULL,command TEXT NOT NULL,embed TEXT);
CREATE TABLE IF NOT EXISTS invoke_dm (guild_id BIGINT NOT NULL,command TEXT NOT NULL,embed TEXT);
CREATE TABLE IF NOT EXISTS warns (guild_id BIGINT NOT NULL,user_id BIGINT NOT NULL,author_id BIGINT NOT NULL,time TEXT NOT NULL,reason TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS warns_punishment (guild_id BIGINT NOT NULL,warn INT NOT NULL,action TEXT NOT NULL,time REAL);
CREATE TABLE IF NOT EXISTS warns_rewards (guild_id BIGINT NOT NULL,warn INT NOT NULL,role_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS voicemaster (
    guild_id BIGINT PRIMARY KEY,
    channel_id BIGINT,
    text BIGINT,
    category BIGINT,
    region TEXT,
    name TEXT DEFAULT '{user.name}''''s lounge',
    bitrate INT,
    savesettings BOOLEAN DEFAULT FALSE,
    banned_words TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS voicemaster_channels (user_id BIGINT NOT NULL,voice BIGINT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS voicemaster_buttons (
    guild_id BIGINT NOT NULL,
    "action" TEXT NOT NULL,
    label TEXT,
    emoji TEXT,
    style TEXT,
    PRIMARY KEY (guild_id,action)
);
CREATE TABLE IF NOT EXISTS voicemaster_names (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    name TEXT,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS voicemaster_presets (user_id BIGINT NOT NULL,name TEXT NOT NULL,settings TEXT,overwrites TEXT,autoload BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS voicerole (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,roles TEXT);
CREATE TABLE IF NOT EXISTS voicerole_default (guild_id BIGINT NOT NULL,role_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS button_role (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,message_id BIGINT NOT NULL,button_id TEXT NOT NULL,role_id BIGINT NOT NULL,label TEXT,emoji TEXT);
CREATE TABLE IF NOT EXISTS button_settings (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,message_id BIGINT NOT NULL,"unique" BOOLEAN,UNIQUE (guild_id, message_id));
CREATE TABLE IF NOT EXISTS voicetrack (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    total_time REAL DEFAULT 0,
    joined_time REAL,
    mute_time REAL,
    muted_time REAL,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS voicetrack_settings (guild_id BIGINT PRIMARY KEY,state BOOLEAN DEFAULT FALSE,level_state BOOLEAN DEFAULT FALSE,mute_track BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS leveling (
    guild_id BIGINT PRIMARY KEY,
    message TEXT,
    channel_id BIGINT,
    booster BOOLEAN DEFAULT FALSE,
    multiplier INT DEFAULT 1,
    command TEXT,
    stack BOOLEAN DEFAULT FALSE,
    voice_booster BOOLEAN DEFAULT FALSE,
    voice_multiplier INT DEFAULT 1,
    roles TEXT DEFAULT '[]',
    channels TEXT DEFAULT '[]',
    users TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS level_user (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    xp REAL DEFAULT 0,
    level INT DEFAULT 0,
    target_xp INT DEFAULT 100,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS level_rewards (guild_id BIGINT NOT NULL,level INT NOT NULL,role_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS level_multiplier (guild_id BIGINT NOT NULL,role_id BIGINT NOT NULL,multiplier INT DEFAULT 1);
CREATE TABLE IF NOT EXISTS level_multiplier_voice (guild_id BIGINT NOT NULL,role_id BIGINT NOT NULL,multiplier INT DEFAULT 1);
CREATE TABLE IF NOT EXISTS economy (
    user_id BIGINT PRIMARY KEY,
    cash REAL DEFAULT 5000.00,
    card REAL DEFAULT 0.00,
    item_bank REAL DEFAULT 0.00,
    beg INT DEFAULT 0,
    bonus INT DEFAULT 0,
    work INT DEFAULT 0,
    slut INT DEFAULT 0,
    rob INT DEFAULT 0,
    daily INT DEFAULT 0,
    daily_streak INT DEFAULT 0,
    quest INT DEFAULT 0,
    item_case INT DEFAULT 0,
    item_case_blackice INT DEFAULT 0,
    terms BOOLEAN DEFAULT FALSE,
    married_to BIGINT
);
CREATE TABLE IF NOT EXISTS economy_config (active BOOLEAN DEFAULT TRUE,beg_min REAL DEFAULT 100,beg_max REAL DEFAULT 500,bonus_min REAL DEFAULT 50,bonus_max REAL DEFAULT 200,work_min REAL DEFAULT 200,work_max REAL DEFAULT 800,slut_min REAL DEFAULT 50,slut_max REAL DEFAULT 300,daily_min REAL DEFAULT 500,daily_max REAL DEFAULT 1500,vote REAL DEFAULT 2500);
CREATE TABLE IF NOT EXISTS economy_users (
    user_id BIGINT NOT NULL,
    guild_id BIGINT NOT NULL,
    money_amount REAL DEFAULT 0,
    economy_level INT DEFAULT 1,
    PRIMARY KEY (user_id,guild_id)
);
CREATE TABLE IF NOT EXISTS economy_logs (
    user_id BIGINT NOT NULL,
    amount REAL NOT NULL,
    "action" TEXT NOT NULL,
    type TEXT NOT NULL,
    created REAL NOT NULL,
    cash REAL,
    card REAL
);
CREATE TABLE IF NOT EXISTS economy_logs_lab (
    user_id BIGINT NOT NULL,
    moderator_id BIGINT NOT NULL,
    amount REAL NOT NULL,
    "action" TEXT NOT NULL,
    upgrade_state INT,
    created REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS economy_logs_business (
    user_id BIGINT NOT NULL,
    moderator_id BIGINT NOT NULL,
    amount REAL NOT NULL,
    "action" TEXT NOT NULL,
    business TEXT,
    created REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS economy_logs_wipe (user_id BIGINT NOT NULL,moderator_id BIGINT NOT NULL,cash REAL,card REAL,bank REAL,lab REAL,business REAL,created REAL NOT NULL);
CREATE TABLE IF NOT EXISTS economy_shop (guild_id BIGINT PRIMARY KEY,state BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS economy_shop_items (
    guild_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    amount REAL NOT NULL,
    name TEXT NOT NULL,
    "limit" INT,
    time BIGINT
);
CREATE TABLE IF NOT EXISTS economy_shop_earnings (guild_id BIGINT PRIMARY KEY,amount REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS economy_business (
    user_id BIGINT NOT NULL,
    last_collected REAL NOT NULL,
    business_id INT NOT NULL,
    PRIMARY KEY (user_id,business_id)
);
CREATE TABLE IF NOT EXISTS economy_business_list (business_id INT PRIMARY KEY,name TEXT NOT NULL,description TEXT,cost REAL DEFAULT 0,earnings REAL DEFAULT 0,emoji TEXT,image TEXT);
CREATE TABLE IF NOT EXISTS economy_cards (id BIGINT PRIMARY KEY,name TEXT NOT NULL,stars INT DEFAULT 1,business TEXT NOT NULL,image TEXT);
CREATE TABLE IF NOT EXISTS economy_cards_user (
    id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    card_id BIGINT NOT NULL,
    business TEXT NOT NULL,
    storage REAL,
    multiplier REAL,
    image TEXT,
    background TEXT DEFAULT 'standard',
    active BOOLEAN DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS economy_cards_used (user_id BIGINT NOT NULL,card_id BIGINT NOT NULL,business TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS economy_lab (
    user_id BIGINT PRIMARY KEY,
    ampoules INT DEFAULT 100,
    last_collected REAL,
    upgrade_state INT DEFAULT 0,
    multiplier REAL DEFAULT 1.0
);
CREATE TABLE IF NOT EXISTS economy_investments (id INT PRIMARY KEY,name TEXT NOT NULL,cost REAL DEFAULT 0,earnings REAL DEFAULT 0,days INT DEFAULT 1,description TEXT);
CREATE TABLE IF NOT EXISTS economy_investments_started (id INT NOT NULL,user_id BIGINT PRIMARY KEY,timestamp REAL NOT NULL,active BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS company (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tag TEXT NOT NULL,
    ceo BIGINT NOT NULL,
    members TEXT DEFAULT '[]',
    privacy TEXT DEFAULT 'public',
    roles TEXT DEFAULT '{}',
    level INT DEFAULT 1,
    vault REAL DEFAULT 0,
    vault_limit REAL DEFAULT 0,
    reputation INT DEFAULT 0,
    votes INT DEFAULT 0,
    created REAL,
    description TEXT,
    icon TEXT
);
CREATE TABLE IF NOT EXISTS company_earnings (company_id INT NOT NULL,user_id BIGINT NOT NULL,amount REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS company_invites (user_id BIGINT NOT NULL,company_id INT NOT NULL,message_id BIGINT,created REAL NOT NULL);
CREATE TABLE IF NOT EXISTS company_requests (company_id INT NOT NULL,user_id BIGINT NOT NULL,text TEXT,created REAL NOT NULL);
CREATE TABLE IF NOT EXISTS company_projects (name TEXT PRIMARY KEY,cost REAL DEFAULT 0,votes INT DEFAULT 0,"group" INT DEFAULT 1,emoji TEXT,description TEXT,image TEXT,earnings REAL DEFAULT 0,reputation INT DEFAULT 0);
CREATE TABLE IF NOT EXISTS company_projects_started (company_id INT PRIMARY KEY,active BOOLEAN DEFAULT TRUE,project_name TEXT NOT NULL,money REAL DEFAULT 0,votes INT DEFAULT 0,participant TEXT DEFAULT '{}',created REAL);
CREATE TABLE IF NOT EXISTS company_upgrades (level INT PRIMARY KEY,cost REAL DEFAULT 0,reputation INT DEFAULT 0,members INT DEFAULT 5,managers INT DEFAULT 1,earnings REAL DEFAULT 0,bonus REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS company_limit_withdraw (user_id BIGINT NOT NULL,spent REAL DEFAULT 0,date TEXT NOT NULL,PRIMARY KEY (user_id,date));
CREATE TABLE IF NOT EXISTS company_limit_bonus (user_id BIGINT NOT NULL,spent REAL DEFAULT 0,date TEXT NOT NULL,PRIMARY KEY (user_id,date));
CREATE TABLE IF NOT EXISTS company_vault (company_id INT NOT NULL,user_id BIGINT NOT NULL,amount REAL NOT NULL,type TEXT NOT NULL,created REAL NOT NULL);
CREATE TABLE IF NOT EXISTS company_voters (user_id BIGINT NOT NULL,company_id INT NOT NULL,votes INT DEFAULT 1);
CREATE TABLE IF NOT EXISTS invites (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    regular_count INT DEFAULT 0,
    left_count INT DEFAULT 0,
    fake_count INT DEFAULT 0,
    bonus_count INT DEFAULT 0,
    bonus INT DEFAULT 0,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS invites_users (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    inviter_id BIGINT NOT NULL,
    invite_code TEXT NOT NULL,
    timestamp REAL NOT NULL,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS invites_settings (guild_id BIGINT PRIMARY KEY,fake_threshold INT,message TEXT,logs BIGINT,autoupdate BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS invites_rewards (guild_id BIGINT NOT NULL,threshold INT NOT NULL,role_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS ticket (
    guild_id BIGINT PRIMARY KEY,
    counter INT DEFAULT 0,
    open_embed TEXT,
    category_id BIGINT,
    logs BIGINT,
    support_roles TEXT DEFAULT '[]',
    claiming BOOLEAN DEFAULT FALSE,
    claiming_privat BOOLEAN DEFAULT FALSE,
    owner_role BIGINT,
    closed BIGINT,
    counter_status BOOLEAN DEFAULT FALSE,
    "limit" INT DEFAULT 5,
    message TEXT
);
CREATE TABLE IF NOT EXISTS ticket_opened (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    topic TEXT,
    claimed_by BIGINT,
    PRIMARY KEY (guild_id,channel_id)
);
CREATE TABLE IF NOT EXISTS ticket_topics (
    guild_id BIGINT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT,
    support_roles TEXT DEFAULT '[]',
    embed TEXT,
    category_id BIGINT,
    channel_name TEXT,
    channel_topic TEXT,
    weight INT DEFAULT 0,
    status BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (guild_id,name)
);
CREATE TABLE IF NOT EXISTS ticket_claims (guild_id BIGINT NOT NULL,user_id BIGINT NOT NULL,channel_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS ticket_modals (guild_id BIGINT NOT NULL,question TEXT,label TEXT,style TEXT,required BOOLEAN DEFAULT TRUE,min_length INT,max_length INT,topic TEXT,name TEXT,description TEXT,code TEXT);
CREATE TABLE IF NOT EXISTS ticket_statuses (guild_id BIGINT NOT NULL,name TEXT NOT NULL,color TEXT,category_id BIGINT);
CREATE TABLE IF NOT EXISTS ticket_transcripts (guild_id BIGINT NOT NULL,user_id BIGINT NOT NULL,moderator_id BIGINT NOT NULL,id TEXT NOT NULL,topic TEXT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS ticket_transcripts_access (guild_id BIGINT NOT NULL,moderator_id BIGINT,user_id BIGINT,users TEXT);
CREATE TABLE IF NOT EXISTS ticket_blacklist (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reason TEXT,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS suggestions (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    message_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    upvotes TEXT DEFAULT '[]',
    downvotes TEXT DEFAULT '[]',
    PRIMARY KEY (guild_id,message_id)
);
CREATE TABLE IF NOT EXISTS suggestions_module (guild_id BIGINT PRIMARY KEY,channel_id BIGINT,role_id BIGINT,threads BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS suggestions_blacklist (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reason TEXT,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS starboard (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,emoji TEXT NOT NULL,count INT NOT NULL);
CREATE TABLE IF NOT EXISTS starboard_messages (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,message_id BIGINT NOT NULL,starboard_message_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS starboard_ignored (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS clownboard (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,emoji TEXT NOT NULL,count INT NOT NULL);
CREATE TABLE IF NOT EXISTS clownboard_messages (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,message_id BIGINT NOT NULL,clownboard_message_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS clownboard_ignored (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS confess (guild_id BIGINT PRIMARY KEY,channel_id BIGINT NOT NULL,confession INT DEFAULT 0);
CREATE TABLE IF NOT EXISTS confess_members (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    member_id INT NOT NULL,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS confess_mute (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    member_id INT NOT NULL,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS confess_blacklist (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reason TEXT,
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS booster_roles (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    shared_users TEXT DEFAULT '[]',
    PRIMARY KEY (guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS booster_module (
    guild_id BIGINT PRIMARY KEY,
    banned_words TEXT DEFAULT '[]',
    share_enabled BOOLEAN DEFAULT TRUE,
    base BIGINT,
    "limit" INT,
    share_limit INT
);
CREATE TABLE IF NOT EXISTS booster_allow (guild_id BIGINT NOT NULL,role_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS booster_award (guild_id BIGINT NOT NULL,role_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS booster_blacklist (guild_id BIGINT NOT NULL,user_id BIGINT NOT NULL,reason TEXT);
CREATE TABLE IF NOT EXISTS booster_lost (guild_id BIGINT NOT NULL,user_id BIGINT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS color_module (guild_id BIGINT PRIMARY KEY,base BIGINT);
CREATE TABLE IF NOT EXISTS color_roles (
    guild_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    color TEXT NOT NULL,
    user_id BIGINT,
    PRIMARY KEY (guild_id,role_id)
);
CREATE TABLE IF NOT EXISTS autopost (
    guild_id BIGINT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    channel_id BIGINT NOT NULL,
    webhook_name TEXT,
    webhook_avatar TEXT,
    UNIQUE (guild_id,type,category)
);
CREATE TABLE IF NOT EXISTS autopost_youtube (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,username TEXT NOT NULL,message TEXT);
CREATE TABLE IF NOT EXISTS autopost_twitter (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,username TEXT NOT NULL,message TEXT);
CREATE TABLE IF NOT EXISTS autopost_tiktok (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    username TEXT NOT NULL,
    message TEXT
);
CREATE TABLE IF NOT EXISTS autopost_instagram (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    username TEXT NOT NULL,
    message TEXT
);
CREATE TABLE IF NOT EXISTS autopost_twitch (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    streamer TEXT NOT NULL,
    message TEXT
);
CREATE TABLE IF NOT EXISTS autopost_youtube_announced (
    channel_id BIGINT NOT NULL,
    video_id TEXT NOT NULL,
    PRIMARY KEY (channel_id,video_id)
);
CREATE TABLE IF NOT EXISTS autopost_twitter_announced (
    channel_id BIGINT NOT NULL,
    tweet_id TEXT NOT NULL,
    PRIMARY KEY (channel_id,tweet_id)
);
CREATE TABLE IF NOT EXISTS autopost_instagram_announced (
    channel_id BIGINT NOT NULL,
    post_id TEXT NOT NULL,
    PRIMARY KEY (channel_id,post_id)
);
CREATE TABLE IF NOT EXISTS autopost_tiktok_announced (
    channel_id BIGINT NOT NULL,
    aweme_id TEXT NOT NULL,
    PRIMARY KEY (channel_id,aweme_id)
);
CREATE TABLE IF NOT EXISTS giveaway (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    message_id BIGINT NOT NULL,
    winners INT NOT NULL,
    members TEXT DEFAULT '[]',
    finish TIMESTAMP NOT NULL,
    host BIGINT NOT NULL,
    title TEXT NOT NULL,
    required_role BIGINT,
    required_bonus INT,
    required_messages INT,
    required_level INT,
    required_invites INT,
    required_ignore BIGINT,
    PRIMARY KEY (guild_id,message_id)
);
CREATE TABLE IF NOT EXISTS giveaway_ended (channel_id BIGINT NOT NULL,message_id BIGINT NOT NULL,members TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS applications (
    guild_id BIGINT NOT NULL,
    name TEXT NOT NULL,
    questions TEXT NOT NULL,
    status BOOLEAN DEFAULT TRUE,
    roles TEXT,
    channel_id BIGINT,
    level INT,
    PRIMARY KEY (guild_id,name)
);
CREATE TABLE IF NOT EXISTS application_responses (id BIGINT PRIMARY KEY,guild_id BIGINT NOT NULL,user_id BIGINT NOT NULL,application_name TEXT NOT NULL,responses TEXT NOT NULL,upvotes INT DEFAULT 0,downvotes INT DEFAULT 0);
CREATE TABLE IF NOT EXISTS application_votes (message_id BIGINT NOT NULL,user_id BIGINT NOT NULL,vote TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS counters (guild_id BIGINT NOT NULL,module TEXT NOT NULL,channeltype TEXT NOT NULL,channel_id BIGINT NOT NULL,message TEXT,role_id BIGINT);
CREATE TABLE IF NOT EXISTS number_counter (guild_id BIGINT PRIMARY KEY,channel_id BIGINT NOT NULL,last_counted BIGINT,current_number INT DEFAULT 1,highest_count INT DEFAULT 1,safemode BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS snipes (channel_id BIGINT NOT NULL,author_id BIGINT NOT NULL,message_content TEXT NOT NULL,attachments TEXT,stickers TEXT,created_at REAL NOT NULL);
CREATE TABLE IF NOT EXISTS snipes_edit (channel_id BIGINT NOT NULL,author_id BIGINT NOT NULL,before_content TEXT,after_content TEXT,created_at REAL NOT NULL);
CREATE TABLE IF NOT EXISTS snipes_reaction (channel_id BIGINT NOT NULL,message_id BIGINT NOT NULL,reaction TEXT NOT NULL,user_id BIGINT NOT NULL,created_at REAL NOT NULL);
CREATE TABLE IF NOT EXISTS lastfm (
    user_id BIGINT PRIMARY KEY,
    username TEXT NOT NULL,
    reactions TEXT DEFAULT '["🔥", "🗑️"]',
    embed TEXT,
    customcmd TEXT,
    reply BOOLEAN DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS lastfm_crowns (artist TEXT PRIMARY KEY,user_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS embeds_templates (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,user_id BIGINT,code TEXT,embed TEXT,image TEXT);
CREATE TABLE IF NOT EXISTS webhook (
    guild_id BIGINT NOT NULL,
    code TEXT NOT NULL,
    url TEXT NOT NULL,
    channel TEXT NOT NULL,
    name TEXT,
    avatar TEXT,
    PRIMARY KEY (guild_id,code)
);
CREATE TABLE IF NOT EXISTS webhook_username (guild_id BIGINT NOT NULL,webhook_url TEXT PRIMARY KEY,length INT,name TEXT,avatar TEXT);
CREATE TABLE IF NOT EXISTS webhook_vanity (guild_id BIGINT NOT NULL,webhook_url TEXT PRIMARY KEY,length INT,name TEXT,avatar TEXT);
CREATE TABLE IF NOT EXISTS activity_messages (
    user_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    server_id BIGINT NOT NULL,
    message_date DATE NOT NULL,
    message_count INT DEFAULT 0,
    PRIMARY KEY (user_id,server_id,message_date)
);
CREATE TABLE IF NOT EXISTS activity_voice (
    user_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    server_id BIGINT NOT NULL,
    voice_date DATE NOT NULL,
    voice_time REAL DEFAULT 0,
    PRIMARY KEY (user_id,server_id,voice_date)
);
CREATE TABLE IF NOT EXISTS activity_joined (guild_id BIGINT NOT NULL,user_id BIGINT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS activity_left (guild_id BIGINT NOT NULL,user_id BIGINT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS activity_ignore (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    PRIMARY KEY (guild_id,channel_id)
);
CREATE TABLE IF NOT EXISTS activity_leaderboard (
    guild_id BIGINT NOT NULL,
    type TEXT NOT NULL,
    "range" TEXT NOT NULL,
    message_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS growth (guilds INT DEFAULT 0,users INT DEFAULT 0,ping REAL DEFAULT 0,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS guild_names (guild_id BIGINT PRIMARY KEY,guild_name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS guildnames (guild_id BIGINT NOT NULL,old_name TEXT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS owner_history (guild_id BIGINT NOT NULL,old_owner BIGINT NOT NULL,new_owner BIGINT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS vanitys (guild_id BIGINT NOT NULL,vanity TEXT NOT NULL,time REAL NOT NULL);
CREATE TABLE IF NOT EXISTS usernames (user_id BIGINT NOT NULL,username TEXT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS nicknames (user_id BIGINT NOT NULL,nickname TEXT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS avatar_history (user_id BIGINT NOT NULL,avatar TEXT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS seen (
    user_id BIGINT NOT NULL,
    guild_id BIGINT NOT NULL,
    time REAL NOT NULL,
    PRIMARY KEY (user_id,guild_id)
);
CREATE TABLE IF NOT EXISTS afk (user_id BIGINT PRIMARY KEY,reason TEXT,time TIMESTAMP);
CREATE TABLE IF NOT EXISTS timezone (user_id BIGINT PRIMARY KEY,zone TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS marry (author BIGINT PRIMARY KEY,soulmate BIGINT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS storagevault (
    user_id BIGINT NOT NULL,
    "key" TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (user_id,key)
);
CREATE TABLE IF NOT EXISTS language (
    user_id BIGINT PRIMARY KEY,
    languages TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS language_translate (user_id BIGINT NOT NULL,language TEXT NOT NULL,ephemeral BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS birthday (user_id BIGINT PRIMARY KEY,day INT NOT NULL,month INT NOT NULL,year INT);
CREATE TABLE IF NOT EXISTS birthday_reward (guild_id BIGINT NOT NULL,role_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS reminder (user_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,guild_id BIGINT NOT NULL,remind_time REAL NOT NULL,task TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS avatar_privacy (user_id BIGINT PRIMARY KEY,status BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS spotify_tokens (discord_id BIGINT PRIMARY KEY,access_token TEXT NOT NULL,refresh_token TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS spotify_devices (discord_id BIGINT PRIMARY KEY,device_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS paginate_embeds (guild_id BIGINT NOT NULL,channel_id BIGINT NOT NULL,message_id BIGINT NOT NULL,embed TEXT NOT NULL,page INT NOT NULL,PRIMARY KEY (guild_id,channel_id,message_id,page));
CREATE TABLE IF NOT EXISTS paginate_data (message_id BIGINT PRIMARY KEY,current_page INT DEFAULT 1);
CREATE TABLE IF NOT EXISTS tags_user (user_id BIGINT NOT NULL,name TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY (user_id,name));
CREATE TABLE IF NOT EXISTS tags (guild_id BIGINT NOT NULL,author_id BIGINT NOT NULL,name TEXT NOT NULL,response TEXT,PRIMARY KEY (guild_id,name));
CREATE TABLE IF NOT EXISTS embeds (code TEXT PRIMARY KEY,embed TEXT,user_id BIGINT);
CREATE TABLE IF NOT EXISTS freegames (guild_id BIGINT PRIMARY KEY,channel_id BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS votes (user_id BIGINT PRIMARY KEY,vote_until REAL,vote_count INT DEFAULT 0,vote_reminder BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS guessthenumber (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    number INT,
    PRIMARY KEY (guild_id,channel_id)
);
CREATE TABLE IF NOT EXISTS guessthenumber_settings (guild_id BIGINT NOT NULL,min INT DEFAULT 1,max INT DEFAULT 100,cooldown INT DEFAULT 60,channel_id BIGINT);
CREATE TABLE IF NOT EXISTS quests (id INT PRIMARY KEY,difficult TEXT NOT NULL,name TEXT,description TEXT,mode TEXT,type TEXT,amount INT DEFAULT 0,earnings REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS quests_user (user_id BIGINT PRIMARY KEY,id INT NOT NULL,difficult TEXT,amount INT DEFAULT 0,completed BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS gamestats (
    user_id BIGINT NOT NULL,
    game TEXT NOT NULL,
    wins INT DEFAULT 0,
    loses INT DEFAULT 0,
    "ties" INT DEFAULT 0,
    PRIMARY KEY (user_id,game)
);
CREATE TABLE IF NOT EXISTS bugreports (case_id TEXT NOT NULL,user_id BIGINT NOT NULL,moderator_id BIGINT NOT NULL,reason TEXT NOT NULL,timestamp REAL NOT NULL);
CREATE TABLE IF NOT EXISTS guns (
    user_id BIGINT NOT NULL,
    uid TEXT NOT NULL,
    PRIMARY KEY (user_id,uid)
);
CREATE TABLE IF NOT EXISTS clashofclans (
    user_id BIGINT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (user_id,tag)
);
CREATE TABLE IF NOT EXISTS instagram (
    user_id BIGINT NOT NULL,
    username TEXT NOT NULL,
    PRIMARY KEY (user_id,username)
);
CREATE TABLE IF NOT EXISTS testimonials (user_id BIGINT NOT NULL,testimonial TEXT NOT NULL,timestamp REAL);
CREATE TABLE IF NOT EXISTS payment_methods (guild_id BIGINT NOT NULL,method TEXT NOT NULL,receiver TEXT NOT NULL,available BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS payment_currency (guild_id BIGINT PRIMARY KEY,currency TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS checkout (message BIGINT PRIMARY KEY,amount TEXT);
CREATE TABLE IF NOT EXISTS instance (user_id BIGINT PRIMARY KEY,owner_id BIGINT NOT NULL,status TEXT,name TEXT,paid REAL,guild_id BIGINT,transfers INT DEFAULT 3);
CREATE TABLE IF NOT EXISTS store_orders (serial_code TEXT PRIMARY KEY,product_id INT,claimed BOOLEAN DEFAULT FALSE,claimed_by BIGINT,user_id BIGINT,product TEXT,timestamp REAL);
CREATE TABLE IF NOT EXISTS reposter (
    guild_id BIGINT PRIMARY KEY,
    status BOOLEAN DEFAULT TRUE,
    prefix TEXT,
    "delete" BOOLEAN DEFAULT FALSE,
    embed BOOLEAN DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS reposter_channels (
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    PRIMARY KEY (guild_id,channel_id)
);
CREATE TABLE IF NOT EXISTS instance_addon (shard_id INT NOT NULL,guild_id BIGINT NOT NULL,user_id BIGINT,paid REAL,owner_id BIGINT);
CREATE TABLE IF NOT EXISTS vanity (
    guild_id BIGINT PRIMARY KEY,
    "trigger" TEXT,
    channel_id BIGINT,
    message TEXT,
    roles TEXT DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_command_stats_guild ON command_stats(guild_id);
CREATE INDEX IF NOT EXISTS idx_command_stats_user ON command_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_command_history_server ON command_history(server_id);
CREATE INDEX IF NOT EXISTS idx_command_history_user ON command_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_server ON history(server_id);
CREATE INDEX IF NOT EXISTS idx_history_moderator ON history(moderator_id);
CREATE INDEX IF NOT EXISTS idx_economy_logs_user ON economy_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_snipes_channel ON snipes(channel_id);
CREATE INDEX IF NOT EXISTS idx_snipes_edit_channel ON snipes_edit(channel_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_guild ON suggestions(guild_id);
CREATE INDEX IF NOT EXISTS idx_ticket_opened_user ON ticket_opened(user_id);
CREATE INDEX IF NOT EXISTS idx_lastfm_user ON lastfm(user_id);
CREATE INDEX IF NOT EXISTS idx_level_user_guild ON level_user(guild_id);
CREATE INDEX IF NOT EXISTS idx_activity_messages_server ON activity_messages(server_id);
CREATE INDEX IF NOT EXISTS idx_activity_voice_server ON activity_voice(server_id);
CREATE INDEX IF NOT EXISTS idx_voicetrack_guild ON voicetrack(guild_id);
CREATE INDEX IF NOT EXISTS idx_invites_guild ON invites(guild_id);
CREATE INDEX IF NOT EXISTS idx_invites_users_guild ON invites_users(guild_id);
CREATE INDEX IF NOT EXISTS idx_giveaway_guild ON giveaway(guild_id);
CREATE INDEX IF NOT EXISTS idx_autopost_guild ON autopost(guild_id);
-- company indexes are created after the table rebuild in utils/database.js

CREATE TABLE IF NOT EXISTS roleplay (
    user_id BIGINT NOT NULL,
    target_id BIGINT NOT NULL,
    type TEXT NOT NULL,
    count INT DEFAULT 1,
    PRIMARY KEY (user_id,target_id,type)
);
