// ==UserScript==
// @name Verse
// @description Search all Just Dance Now songs in the dance room
// @version 1.3.1
// @license GNU GPL v3. Copyright Thomas Axelsson 2020
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

RESOURCE_URL = GM_getValue('resource-url', 'https://raw.githubusercontent.com/thomasa88/justdance-utils/master/verse-resources');

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

.verse-reset-textbox {
  position: relative;
  color: #444;
  display: flex;
  align-items: center;
}

/* Firefox does not add a reset button to input type="search" */
.verse-reset-textbox input {
  padding-right: 16px;
  width: 180px;
}

/* Hide reset button when box is empty */
/*.verse-reset-textbox input:not(:valid) ~ span {
  display: none;
}*/

.verse-reset-textbox span {
  position: absolute;
  right: 4px;
  width: 16px;
  height: 16px;
  font-size: 20px;
  cursor: pointer;
  color: #555;
  background-image: url(${RESOURCE_URL}/text-clear-white.svg);
  background-size: cover;
  background-position: left;
  background-repeat: no-repeat;
  filter: invert(50%);
  opacity: 40%;
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
  /*all: initial;*/
  /* Restore from site CSS */
  width: 75px; /* Make it wide enough for Chrome */
  min-width: initial;
  font-size: 15px;
  -webkit-appearance: menulist;
  -moz-appearance: menulist;
  appearance: menulist;
  background: white;

  /* Our styling */
}

.verse-difficulty-text {
/*  padding-bottom: 3px; */
/*  letter-spacing: -5px;*/
}

/* Get rid of dashed focus ring in Firefox */
#verse-difficulty-selector:-moz-focusring {
  color: transparent;
  text-shadow: 0 0 0 #000;
}

#verse-difficulty-selector.verse-inactive {
  letter-spacing: unset;
}

.verse-button {
  cursor: pointer;
  display: inline-block;
}

.verse-button.verse-disabled, .verse-inactive {
  opacity: 40%;
}

.verse-in-focus:focus {
  opacity: 100%;
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

#verse-random-button {
  width: 23px;
  height: 23px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  background-image: url(${RESOURCE_URL}/pick-random-white.svg);
}

.verse-reset-button {
  width: 15px;
  height: 15px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  background-image: url(${RESOURCE_URL}/trash-white.svg);
}

.verse-spacer {
  flex-grow: 2;
}

.verse-invert-color {
  filter: invert(75%);
}

.verse-para-space {
  margin-bottom: 12px;
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
filterTextBox = null;
diffSelector = null;
favoriteSelector = null;
tbody = null;
tdiv = null;
noMatchTable = null;
expandButton = null;
resetButton = null;

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
  <span id="verse-reset-button" class="verse-reset-button verse-button verse-inactive" title="Reset the filter"></span>
  <span id="verse-filter-textbox" class="verse-reset-textbox">
    <input id="verse-filter-text" type="text"
      class="verse-in-focus"
      title="Song/artist"
      placeholder="Song or artist">
    <span id="verse-filter-text-reset"></span>
  </span>
  <select id="verse-difficulty-selector" class="verse-difficulty-text verse-in-focus"
    title="Difficulty">
    <option data-seltext="Diffic.">Any</option>
    <option data-seltext="❚">❚ Easy</option>
    <option data-seltext="❚❚">❚❚ Normal</option>
    <option data-seltext="❚❚❚">❚❚❚ Hard</option>
    <option data-seltext="❚❚❚❚">❚❚❚❚ Extreme</option>
    <option selected="selected" hidden>	</option>
  </select>
  <span id="verse-favorites"></span>
  <span id="verse-random-button" class="verse-button" title="Pick random song from matches"></span>
  <span class="verse-spacer"></span>
  <span id="verse-expand-button" class="verse-expand-button verse-expand-hidden" title="Show/hide list"></span>
</div>
<div id="verse-table-div" class="verse-hidden">
  <!-- Using a table for "no match" to get the same styling -->
  <table id="verse-filter-no-match-table" class="verse-filter-table verse-hidden">
    <tbody id="verse-filter-no-match-tbody">
      <tr>
        <td>
          <p class="verse-para-space">No matches.</p>
          <p>
            <span id="verse-filter-no-match-reset"><span class="verse-reset-button verse-button verse-invert-color" title="Reset the filter"></span> Reset the filter</span>
          </p>
        </td>
      </tr>
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

    difficulty.classList.add('verse-difficulty-text');
    if (song.difficulty) {
      difficulty.innerText = "❚".repeat(song.difficulty);
    } else {
      difficulty.innerHTML = "&nbsp;";
    }

    for (let i = 0; i < 4; i++) {
      let span = document.createElement('span');
      span.classList.add('verse-button', 'verse-favorite-button', 'verse-invert-color');
      if (i == 0) {
        span.style.backgroundImage = `url(${RESOURCE_URL}/favorite-mobile-white.svg)`;
        span.onclick = (e => {
          alert('User favorites can only be modified in the mobile app.');
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

  filterTextBox = document.getElementById('verse-filter-textbox');
  filterText = document.getElementById('verse-filter-text');
  filterText.onkeyup = filter;
  filterText.onclick = (() => filterText.select());
  expandButton = document.getElementById('verse-expand-button');
  filterText.onfocus = (() => {
    showTable();
  });
  expandButton.onclick = (() => {
    toggleTable();
  });

  filterTextReset = document.getElementById('verse-filter-text-reset');
  filterTextReset.onclick = (() => {
    filterText.value = '';
    filterText.focus();
    filter();
  });
  
  diffSelector = document.getElementById('verse-difficulty-selector');
  diffSelector.classList.add('verse-inactive');
  diffSelector.difficulty = 0;
  diffSelector.textIndex = diffSelector.options.length - 1;
  diffSelector.textOption = diffSelector.options[diffSelector.textIndex];
  diffSelector.textOption.text = diffSelector.options[diffSelector.difficulty].getAttribute('data-seltext');
  diffSelector.onchange = (e => {
    setDiffselectorValue(diffSelector.selectedIndex);
    showTable();
    filter();
  });

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

  resetButton = document.getElementById('verse-reset-button');
  resetButton.onclick = clearFilter;

  let tableResetButton = document.getElementById('verse-filter-no-match-tbody');
  tableResetButton.onclick = clearFilter;

  filter();
}

function setDiffselectorValue(difficulty) {
  diffSelector.difficulty = difficulty;
  diffSelector.selectedIndex = diffSelector.textIndex;
  diffSelector.textOption.text = diffSelector.options[diffSelector.difficulty].getAttribute('data-seltext');
}

function filter() {
  updateTableUserFavorites();

  diffSelector.classList.toggle('verse-inactive', diffSelector.difficulty == 0);
  filterTextBox.classList.toggle('verse-inactive', filterText.value.length == 0);

  let filterFavorites = [];
  for (let i = 0; i < favoriteSelector.children.length; i++) {
    if (!favoriteSelector.children[i].classList.contains('verse-inactive')) {
      if (i == 0) {
        filterFavorites.push(getPlayerFavs());
      } else {
        filterFavorites.push(favorites[i]);
      }
    }
  }

  let isFiltering = (filterText.value.length > 0 ||
                     diffSelector.difficulty != 0 ||
                     filterFavorites.length > 0);
  resetButton.classList.toggle('verse-inactive', !isFiltering);

  let lower = filterText.value.toLowerCase();
  let matchCount = 0;
  for (let i = 0; i < tbody.rows.length; i++) {
    let row = tbody.rows[i];
    let match = ((row.artistLower.indexOf(lower) != -1 ||
                  row.titleLower.indexOf(lower) != -1) &&
                 (diffSelector.difficulty == 0 ||
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

function clearFilter() {
  filterText.value = '';
  setDiffselectorValue(0);
  for (let fav of favoriteSelector.children) {
    fav.classList.add('verse-inactive');
  }
  filter();
  filterText.focus();
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
