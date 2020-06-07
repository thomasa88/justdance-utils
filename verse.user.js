// ==UserScript==
// @name Verse
// @description Search all Just Dance Now songs in the dance room
// @version 0.1.9
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
  background-color: #fd9802;
}

#verse-filter-table td {
  padding: 5px;
  border-width: 1px 0px 1px 0px;
  border-color: #ffdaa3;
  border-style: solid;
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
`);

songCache = JSON.parse(GM_getResourceText('songcache'));
log("Loaded " + Object.keys(songCache).length + " cached songs");

sortedSongs = [];

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
  dialog.innerHTML = '<div><input id="verse-filter-text" type="text"><span id="verse-expand-button" class="verse-expand-button verse-expand-hidden"></span></div><div id="verse-table-div" class="verse-hidden"><table id="verse-filter-table"><colgroup><col><col><col class="verse-diff-col"></colgroup><tbody id="verse-filter-tbody"></tbody></div>';
  parent.appendChild(dialog);

  let tdiv = document.getElementById('verse-table-div');
  let tbody = document.getElementById('verse-filter-tbody');
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
    row.difficulty = song.difficulty;
    
    row.onclick = (_ => unsafeWindow.jd.gui.songSelection.focusSong(song.id, 0));
  });

  let filterText = document.getElementById('verse-filter-text');
  filterText.placeholder = 'Find songs (' + sortedSongs.length + ')';
  filterText.onkeyup = (e => {
    let lower = e.target.value.toLowerCase();
    for (let i = 0; i < tbody.rows.length; i++) {
      let row = tbody.rows[i];
      if (row.artistLower.indexOf(lower) != -1 || row.titleLower.indexOf(lower) != -1)
      {
        row.style.display = '';
      } else  {
        row.style.display = 'none';
      }
    }
  });
  filterText.onclick = (e => filterText.select());
  let expandButton = document.getElementById('verse-expand-button');
  filterText.onfocus = (_ => {
    tdiv.classList.remove("verse-hidden");
    expandButton.classList.remove("verse-expand-hidden");
  });
  expandButton.onclick = (_ => {
    tdiv.classList.toggle("verse-hidden");
    expandButton.classList.toggle("verse-expand-hidden");
  });
}

