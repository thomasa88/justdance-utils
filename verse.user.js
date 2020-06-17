// ==UserScript==
// @name Verse
// @description Search all Just Dance Now songs in the dance room
// @version 1.2.1
// @license GNU GPL v3. Copyright Thomas Axelsson 2019
// @homepageURL https://github.com/thomasa88/justdance-utils
// @namespace thomasa88
// @match *://justdancenow.com/
// @grant GM_addStyle
// @grant GM_getResourceText
// @grant GM_info
// @grant GM_setValue
// @grant GM_getValue
// @resource songcache https://pastebin.com/raw/f7XZWs8k
// ==/UserScript==

//
// Copyright  Thomas Axelsson 2020
//
// This userscript is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This userscript is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this userscript.  If not, see <https://www.gnu.org/licenses/>.
//

//RESOURCE_URL = 'https://raw.githubusercontent.com/thomasa88/justdance-utils/master/verse-resources'

GM_addStyle(`
#verse-filter-dialog {
  position: absolute;
  right: 5px;
  top: 20%; /* Just below players */
  max-height: 80%;
  min-width: 300px;
  max-width: 40%;
  width: 40%;
  font-size: 30px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

#verse-filter-bar {
  display: flex;
  align-items: center;
}

#verse-filter-bar > * {
  margin-right: 10px;
}

#verse-filter-text {
  width: 180px;
  color: #444;
}

#verse-table-div {
  overflow-y: scroll;
}

.verse-filter-table {
  padding: 0px;
  width: 99%;
  border-collapse: collapse;
  table-layout: fixed;
  margin: 0px;
}

.verse-filter-table tr {
  cursor: pointer;
}

.verse-filter-table tr:hover {
  background-color: #fb9e5a;
}

.verse-filter-table td {
  padding: 5px;
  border-width: 1px 0px 1px 0px;
  border-color: #ffdaa3;
  border-style: solid;
  color: #444;
  vertical-align: middle;
}

.verse-diff-col {
  width: 3.5em;
}

.verse-fav-col {
  width: 110px;
}

.verse-expand-button {
  background-image: url(https://jdnowweb-s.cdn.ubi.com/prod/main/20200601_0920/web/img/buttons/button_play.svg);
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  width: 20px;
  display: inline-block;
  height: 20px;
  transform: rotate(90deg);
  vertical-align: middle;
  cursor: pointer;
}

.verse-hidden {
  display: none;
}

.verse-expand-hidden {
  transform: rotate(-90deg);
}

#verse-difficulty-selector {
  /*padding: 0px 5px 0px 5px;*/
  border-radius: 5px;
  box-sizing: unset;
  /*background: #ffffff33;*/
  height: 25px;
  display: flex;
  align-items: center;
}

#verse-difficulty-selector.verse-active {
  /*background: #ffffff55;*/
}

.verse-button {
  cursor: pointer;
  display: inline-block;
}

.verse-button.verse-disabled, .verse-inactive {
  opacity: 40%;
}

.verse-diff-button {
  background-image: url(${RESOURCE_URL}/score-bar-white.svg);
  width: 9px;
  height: 17px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

#verse-favorites {
  display: flex;
  align-items: center;
}

.verse-favorite-button {
  width: 23px;
  height: 23px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  margin-right: 1px;
}

.verse-spacer {
  flex-grow: 2;
}

.verse-invert-color {
  filter: invert(100%);
}
`);

DIFFICULTY_MAP = { 'Easy': 1,
                   'Normal': 2,
                   'Hard': 3,
                   'Extreme': 4 };

log("Verse " + GM_info.script.version + " running in " +
    GM_info.scriptHandler + " " + GM_info.version);

songCache = JSON.parse(GM_getResourceText('songcache'));
log("Loaded " + Object.keys(songCache).length + " cached songs");

sortedSongs = [];
favorites = {};

filterText = null;
diffSelector = null;
favoriteSelector = null;
tbody = null;
tdiv = null;
noMatchTable = null;
expandButton = null;

function log(msg) {
  console.log('Verse:', msg);
}

function waitForPage() {
  if (unsafeWindow.require && document.querySelector('#coverflow')) {
    let songs = unsafeWindow.require('songs');
    let newSongs = {};
    sortedSongs = songs.getSongIds().map(id => {
      let song = songCache[id];
      if (!song) {
        log("Fetch song: " + id)
        let onlineSong = songs.getSong(id);
        song = {}
        for (const attr of ['id', 'name', 'artist']) {
          song[attr] = onlineSong[attr];
        }
        let difficulty = onlineSong['Difficulty'];
        if (typeof difficulty === 'undefined') {
          difficulty = null;
        } else if (DIFFICULTY_MAP.hasOwnProperty(difficulty)) {
          difficulty = DIFFICULTY_MAP[difficulty];
        }
        song['difficulty'] = difficulty;
        newSongs[song.id] = song;
      }
      return song;
    });
    log("Loaded " + sortedSongs.length + " songs");
    if (Object.keys(newSongs).length > 0) {
      log("Add to cache: " + JSON.stringify(newSongs));
    }
  }

  if (sortedSongs.length > 0) {
    log("Room loaded");
    init();
  } else {
    log("Waiting for room to load");
    setTimeout(waitForPage, 1000);
  }
}

waitForPage();

function init() {
  loadFavorites();
  
  sortedSongs.sort((a, b) => {
    let aArtist = a.artist.toLowerCase();
    let bArtist = b.artist.toLowerCase();
    if (aArtist < bArtist) {
      return -1;
    } else if (aArtist > bArtist) {
      return 1;
    } else {
      let aName = a.name.toLowerCase();
      let bName = b.name.toLowerCase();
      if (aName < bName) {
        return -1;
      } else if (aName > bName) {
        return 1;
      } else {
        return 0;
      }
    }
  });

  let parent = document.querySelector('#coverflow');
  let dialog = document.createElement('div');
  dialog.id = 'verse-filter-dialog';
  dialog.innerHTML = `
<div id="verse-filter-bar">
  <input id="verse-filter-text" type="text"
    title="Song/artist"
    placeholder="Song or artist">
  <span id="verse-difficulty-selector"></span>
  <span id="verse-favorites"></span>
  <span id="verse-random-button" class="verse-button" title="Random song from matches">?!</span>
  <span class="verse-spacer"></span>
  <span id="verse-expand-button" class="verse-expand-button verse-expand-hidden" title="Show/hide list"></span>
</div>
<div id="verse-table-div" class="verse-hidden">
  <!-- Using a table for "no match" to get the same styling -->
  <table id="verse-filter-no-match-table" class="verse-filter-table verse-hidden">
    <tbody id="verse-filter-no-match-tbody">
      <tr><td>No songs match the current filter</td></tr>
    </tbody>
  </table>
  <table id="verse-filter-table" class="verse-filter-table">
    <colgroup>
      <col>
      <col>
      <col class="verse-diff-col">
      <col class="verse-fav-col">
    </colgroup>
    <tbody id="verse-filter-tbody"></tbody>
  </table>
</div>`;
  parent.appendChild(dialog);

  noMatchTable = document.getElementById('verse-filter-no-match-table');
  
  tdiv = document.getElementById('verse-table-div');
  tbody = document.getElementById('verse-filter-tbody');
  sortedSongs.forEach(song => {
    let row = tbody.insertRow();
    //let image = row.insertCell(-1);
    let artist = row.insertCell(-1);
    let title = row.insertCell(-1);
    let difficulty = row.insertCell(-1);
    let favoritesCell = row.insertCell(-1);
    
    artist.innerText = song.artist;
    title.innerText = song.name;
    if (song.difficulty) {
      difficulty.innerText = "●".repeat(song.difficulty);
    } else {
      difficulty.innerHTML = "&nbsp;";
    }

    for (let i = 0; i < 4; i++) {
      let span = document.createElement('span');
      span.classList.add('verse-button', 'verse-favorite-button', 'verse-invert-color');
      if (i == 0) {
        span.style.backgroundImage = `url(${RESOURCE_URL}/favorite-mobile-white.svg)`;
        span.onclick = (e => {
          alert('User favorites can only be modified in the mobile app');
          e.stopPropagation();
        });
      } else {
        span.classList.toggle('verse-inactive',
                              (favorites[i].indexOf(song.id) == -1));
        
        span.style.backgroundImage = `url(${RESOURCE_URL}/favorite${i}-white.svg)`;
        span.onclick = (e => {
          span.classList.toggle('verse-inactive');
          if (span.classList.contains('verse-inactive')) {
            removeFavorite(i, song.id);
            filter();
          } else {
            addFavorite(i, song.id);
          }
          e.stopPropagation();
        });
      }
      
      favoritesCell.appendChild(span);
    }

    row.songId = song.id;
    row.artistLower = song.artist.toLowerCase();
    row.titleLower = song.name.toLowerCase();
    row.difficulty = song.difficulty || 0;
    
    row.onclick = (_ => unsafeWindow.jd.gui.songSelection.focusSong(song.id, 0));
  });

  filterText = document.getElementById('verse-filter-text');
  filterText.onkeyup = filter;
  filterText.onclick = (e => filterText.select());
  expandButton = document.getElementById('verse-expand-button');
  filterText.onfocus = (_ => {
    showTable();
  });
  expandButton.onclick = (_ => {
    toggleTable();
  });

  diffSelector = document.getElementById('verse-difficulty-selector');
  diffSelector.difficulty = 2;
  diffSelector.enabled = false;
  for (let i = 1; i < 5; i++) {
    let span = document.createElement('span');
    span.classList.add('verse-button');
    span.classList.add('verse-diff-button');
    for (let diffName in DIFFICULTY_MAP) {
      if (DIFFICULTY_MAP[diffName] == i) {
        span.title = 'Difficulty: ' + diffName;
        break;
      }
    }
    span.onclick = (e => {
      if (diffSelector.enabled && diffSelector.difficulty == i) {
        // Disable filtering if clicking same difficulty twice
        diffSelector.enabled = false;
      } else {
        diffSelector.enabled = true;
        diffSelector.difficulty = i;
      }
      showTable();
      filter();
    });
    diffSelector.appendChild(span);
  }

  let randomButton = document.getElementById('verse-random-button');
  randomButton.onclick = randomize;

  favoriteSelector = document.getElementById('verse-favorites');
  for (let i = 0; i < 4; i++) {
    let span = document.createElement('span');
    span.classList.add('verse-button', 'verse-favorite-button', 'verse-inactive');
    // Failing to show Blob, so skipping GM_getResourceURL
    //span.style.backgroundImage = 'url("' + GM_getResourceURL('fav' + (i+1)) + '")';
    if (i == 0) {
      span.title = 'User mobile phone favorites'
      span.style.backgroundImage = `url(${RESOURCE_URL}/favorite-mobile-white.svg)`;
    } else {
      span.title = 'Favorite list ' + i;
      span.style.backgroundImage = `url(${RESOURCE_URL}/favorite${i}-white.svg)`;
    }
    span.onclick = (e => {
      span.classList.toggle('verse-inactive');
      showTable();
      filter();
    });
    favoriteSelector.appendChild(span);
  }

  filter();
}

function filter() {
  updateTableUserFavorites();

  diffSelector.classList.toggle('verse-active', diffSelector.enabled);
  for (let i = 1; i < diffSelector.childNodes.length + 1; i++) {
    diffSelector.childNodes[i-1].classList.toggle('verse-inactive',
                                                  (i > diffSelector.difficulty &&
                                                  diffSelector.enabled));
    diffSelector.childNodes[i-1].classList.toggle('verse-disabled',
                                                  !diffSelector.enabled);
  }

  filterText.classList.toggle('verse-inactive', filterText.value.length == 0);

  let filterFavorites = [];
  for (let i = 0; i < favoriteSelector.childNodes.length; i++) {
    if (!favoriteSelector.childNodes[i].classList.contains('verse-inactive')) {
      if (i == 0) {
        filterFavorites.push(getPlayerFavs());
      } else {
        filterFavorites.push(favorites[i]);
      }
    }
  }

  let lower = filterText.value.toLowerCase();
  let matchCount = 0;
  for (let i = 0; i < tbody.rows.length; i++) {
    let row = tbody.rows[i];
    let match = ((row.artistLower.indexOf(lower) != -1 ||
                  row.titleLower.indexOf(lower) != -1) &&
                 (!diffSelector.enabled ||
                  row.difficulty == diffSelector.difficulty));
    if (match && filterFavorites.length > 0) {
      let inFavorites = false;
      for (let favSet of filterFavorites) {
        if (favSet.indexOf(row.songId) != -1) {
          inFavorites = true;
          break;
        }
      }
      if (!inFavorites) {
        match = false;
      }
    }
    row.classList.toggle('verse-hidden', !match);
    if (match) {
      matchCount++;
    }
  }
  noMatchTable.classList.toggle('verse-hidden', matchCount != 0);
}

function updateTableUserFavorites() {
  let playerFavs = getPlayerFavs();
  for (let i = 0; i < tbody.rows.length; i++) {
    let row = tbody.rows[i];
    // The first favorite button is the user/mobile favorite button
    let favButton = row.querySelector('.verse-favorite-button');
    favButton.classList.toggle('verse-inactive',
                               (playerFavs.indexOf(row.songId) == -1));
  }
}

function getPlayerFavs() {
  let playerFavs = [];
  for (let playerId in unsafeWindow.jd.gui.core.players) {
    playerFavs = playerFavs.concat(jd.gui.core.players[playerId].favorites);
  }
  return playerFavs;
}

function randomize() {
  let visible = tbody.querySelectorAll('tr:not(.verse-hidden)');
  if (visible.length == 0) {
    alert("No visible songs! Change the filter.");
    return;
  }
  
  let randomPos = Math.floor(Math.random() * visible.length);
  visible[randomPos].click();
}

function loadFavorites() {
  for (let i = 1; i < 4; i++) {
    favorites[i] = GM_getValue('favorites' + i, []);
  }
  // TODO: Mobile favorites
}

function addFavorite(list, songId) {
  if (favorites[list].indexOf(songId) == -1) {
    favorites[list].push(songId);
    GM_setValue('favorites' + list, favorites[list]);
  }
}

function removeFavorite(list, songId) {
  if (favorites[list].indexOf(songId) != -1) {
    favorites[list].splice(songId, 1);
    GM_setValue('favorites' + list, favorites[list]);
  }
}

function toggleTable(show) {
  let hide = !show;
  if (typeof show === 'undefined') {
    hide = undefined;
  }
  tdiv.classList.toggle("verse-hidden", hide);
  expandButton.classList.toggle("verse-expand-hidden", hide);
}

function showTable() {
  toggleTable(true);
}
