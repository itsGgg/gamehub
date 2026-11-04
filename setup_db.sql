
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    date_naissance DATE,
    password_hash TEXT NOT NULL,

    is_online BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_multiplayer BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, game_id)
);

create table if not exists sudoku_games (
    id serial primary key,
    user_id integer references users(id) on delete cascade,
    puzzle varchar(81) not null,
    solution varchar(81) not null,
    state varchar(81) not null,
    finished boolean default false,
    won boolean default false,
    created_at timestamp default current_timestamp,
    finished_at timestamp
);

insert into games (name, description, is_multiplayer) values
    ('sudoku',
     'Remplissez la grille 9x9 : chaque ligne, colonne et bloc 3x3 doit contenir tous les chiffres de 1 a 9.',
     false),
    ('tic-tac-toe',
     'Alignez trois symboles identiques horizontalement, verticalement ou en diagonale.',
     true),
    ('connect4',
     'Faites tomber vos jetons et alignez-en quatre de la meme couleur avant votre adversaire.',
     true)
on conflict (name) do nothing;

CREATE TABLE IF NOT EXISTS invitations (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
    game_id INT REFERENCES games(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expediteur_confirme boolean DEFAULT false,
    destinataire_confirme boolean DEFAULT false,
    confirmation_annulee boolean DEFAULT false,
    scheduled_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
);

create table if not exists connect4_games (
    id serial primary key,
    invitation_id integer references invitations(id) on delete set null,
    player1_id integer not null references users(id) on delete cascade,
    player2_id integer not null references users(id) on delete cascade,
    board varchar(42) not null default '000000000000000000000000000000000000000000',
    current_turn smallint not null default 1,
    status varchar(20) not null default 'in_progress',
    winner_id integer references users(id) on delete set null,
    created_at timestamp default current_timestamp,
    finished_at timestamp
);

create table if not exists connect4_chat (
    id serial primary key,
    game_id integer not null references connect4_games(id) on delete cascade,
    user_id integer not null references users(id) on delete cascade,
    message text not null,
    created_at timestamp default current_timestamp
);

create table if not exists tictactoe_games (
    id serial primary key,
    invitation_id integer references invitations(id) on delete set null,
    player1_id integer not null references users(id) on delete cascade,
    player2_id integer not null references users(id) on delete cascade,
    board varchar(9) not null default '000000000',
    current_turn smallint not null default 1,
    status varchar(20) not null default 'in_progress',
    winner_id integer references users(id) on delete set null,
    created_at timestamp default current_timestamp,
    finished_at timestamp
);

create table if not exists tictactoe_chat (
    id serial primary key,
    game_id integer not null references tictactoe_games(id) on delete cascade,
    user_id integer not null references users(id) on delete cascade,
    message text not null,
    created_at timestamp default current_timestamp
);
