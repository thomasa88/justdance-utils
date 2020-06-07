// ==UserScript==
// @name Verse
// @description Search all Just Dance Now songs in the dance room
// @version 1.2.0
// @license GNU GPL v3. Copyright Thomas Axelsson 2019
// @homepageURL https://github.com/thomasa88/justdance-utils
// @namespace thomasa88
// @match *://justdancenow.com/
// @grant GM_addStyle
// @grant GM_getResourceText
// @resource songcache https://pastebin.com/raw/iwT2iYLZ
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

GM_addStyle(`
#verse-filter-dialog {
  position: absolute;
  right: 5px;
  top: 20%; /* Just below players */
  height: calc(100% - 80px);
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

#verse-filter-table {
  padding: 0px;
  width: 99%;
  border-collapse: collapse;
  table-layout: fixed;
  margin: 0px;
}

#verse-filter-table tr {
  cursor: pointer;
}

#verse-filter-table tr:hover {
  background-color: #fb9e5a;
}

#verse-filter-table td {
  padding: 5px;
  border-width: 1px 0px 1px 0px;
  border-color: #ffdaa3;
  border-style: solid;
  color: #444;
}

.verse-diff-col {
  width: 3.5em;
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
  padding: 0px 5px 0px 5px;
  margin: 5px;
  border: 1px solid white;
  border-radius: 5px;
  height: 20px;
  font-size: 23px;
  vertical-align: top;
  line-height: 20px;
}

.verse-diff-button, .verse-button {
  cursor: pointer;
}

.verse-diff-button.verse-disabled {
  opacity: 40%;
}

.verse-diff-button::after {
  content: "○";
  font-size: 23px;
  line-height: 20px;
}

.verse-diff-button.verse-active::after {
  content: "●";
}

.verse-spacer {
  flex-grow: 2;
}
`);

songCache = JSON.parse(GM_getResourceText('songcache'));
log("Loaded " + Object.keys(songCache).length + " cached songs");

sortedSongs = [];

filterText = null;
diffSelector = null;
tbody = null;
tdiv = null;
expandButton = null;
diffCheck = null;

function log(msg) {
  console.log('Verse:', msg);
}

function waitForPage() {
  if (unsafeWindow.require && document.querySelector('#coverflow')) {
    let songs = unsafeWindow.require('songs');
    sortedSongs = songs.getSongIds().map(id => {
      let song = songCache[id];
      if (!song) {
        log("Fetch song: " + id)
        song = songs.getSong(id);
      }
      return { id: id,
               artist: song.artist,
               name: song.name,
               difficulty: song.difficulty };
    });
    log("Loaded " + sortedSongs.length + " songs");
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
  <input id="verse-filter-text" type="text" title="Search filter">
  <span id="verse-difficulty-selector" title="Difficulty filter"></span>
  <span id="verse-random-button" class="verse-button" title="Random song from matches">?!</span>
  <span class="verse-spacer"></span>
  <span id="verse-expand-button" class="verse-expand-button verse-expand-hidden" title="Show/hide list"></span>
</div>
<div id="verse-table-div" class="verse-hidden">
  <table id="verse-filter-table">
    <colgroup>
      <col>
      <col>
      <col class="verse-diff-col">
    </colgroup>
    <tbody id="verse-filter-tbody"></tbody>
  </table>
</div>`;
  parent.appendChild(dialog);

  tdiv = document.getElementById('verse-table-div');
  tbody = document.getElementById('verse-filter-tbody');
  sortedSongs.forEach(song => {
    let row = tbody.insertRow();
    //let image = row.insertCell(-1);
    let artist = row.insertCell(-1);
    let title = row.insertCell(-1);
    let difficulty = row.insertCell(-1);
    
    artist.innerText = song.artist;
    title.innerText = song.name;
    if (song.difficulty) {
      difficulty.innerText = "●".repeat(song.difficulty);
    } else {
      difficulty.innerHTML = "&nbsp;";
    }
    row.artistLower = song.artist.toLowerCase();
    row.titleLower = song.name.toLowerCase();
    row.difficulty = song.difficulty || 0;
    
    row.onclick = (_ => unsafeWindow.jd.gui.songSelection.focusSong(song.id, 0));
  });

  filterText = document.getElementById('verse-filter-text');
  filterText.placeholder = 'Song or artist'
  filterText.onkeyup = filter;
  filterText.onclick = (e => filterText.select());
  expandButton = document.getElementById('verse-expand-button');
  filterText.onfocus = (_ => {
    toggleTable(true);
  });
  expandButton.onclick = (_ => {
    toggleTable();
  });

  diffSelector = document.getElementById('verse-difficulty-selector');
  diffSelector.difficulty = 2;
  let diffCheckSpan = document.createElement('span');
  //diffCheckSpan.classList.add('verse-diff-button');
  diffCheck = document.createElement('input');
  diffCheck.type = 'checkbox';
  diffCheck.onchange = (e => { toggleTable(true); filter(); });
  diffCheckSpan.appendChild(diffCheck);
  diffSelector.appendChild(diffCheckSpan);
  for (let i = 1; i < 5; i++) {
    let span = document.createElement('span');
    span.classList.add('verse-diff-button');
    span.onclick = (e => {
      diffCheck.checked = true;
      diffSelector.difficulty = i;
      toggleTable(true);
      filter();
    });
    diffSelector.appendChild(span);
  }

  let randomButton = document.getElementById('verse-random-button');
  randomButton.onclick = randomize;

  filter();
}

function filter() {
  for (let i = 1; i < diffSelector.childNodes.length; i++) {
    diffSelector.childNodes[i].classList.toggle('verse-active',
                                                i <= diffSelector.difficulty);
    diffSelector.childNodes[i].classList.toggle('verse-disabled',
                                                !diffCheck.checked);
  }

  let lower = filterText.value.toLowerCase();
  for (let i = 0; i < tbody.rows.length; i++) {
    let row = tbody.rows[i];
    let match = ((row.artistLower.indexOf(lower) != -1 ||
                  row.titleLower.indexOf(lower) != -1) &&
                 (!diffCheck.checked ||
                  row.difficulty == diffSelector.difficulty));
    row.classList.toggle('verse-hidden', !match);
  }
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

function toggleTable(show) {
  let hide = !show;
  if (typeof show === 'undefined') {
    hide = undefined;
  }
  tdiv.classList.toggle("verse-hidden", hide);
  expandButton.classList.toggle("verse-expand-hidden", hide);
}
