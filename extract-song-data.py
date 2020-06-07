#!/usr/bin/python3

import json
import sys

DIFFICULTY_MAP = { 'Easy': 1,
                   'Normal': 2,
                   'Hard': 3,
                   'Extreme': 4 }

f = open(sys.argv[1])
output = open(sys.argv[2], 'w', encoding='utf8')

data = json.load(f)

compact_songs = {}

for song in data:
    compact_song = {}
    for key in ['id', 'name', 'artist']:
        compact_song[key] = song.get(key)
    diff = song.get('Difficulty')
    diff = DIFFICULTY_MAP.get(diff, diff)
    compact_song['difficulty'] = diff
    
    compact_songs[compact_song['id']] = compact_song


json.dump(compact_songs, output, ensure_ascii=False)
