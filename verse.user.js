// ==UserScript==
// @name Verse
// @description Search all Just Dance Now songs in the dance room
// @version 0.1.9
// @license GNU GPL v3. Copyright Thomas Axelsson 2019
// @homepageURL https://github.com/thomasa88/justdance-utils
// @namespace thomasa88
// @match *://justdancenow.com/
// @grant GM_addStyle
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
  right: 0;
  top: 20%; /* Just below players */
  height: calc(100% - 80px);
  width: 300px;
  font-size: 30px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

#verse-table-div {
  overflow-y: auto;
}

#verse-filter-table {
  padding: 0px;
  width: 99%;
  border-collapse: collapse;
}

#verse-filter-table tr {
  cursor: pointer;
}

#verse-filter-table tr:hover {
  background-color: #fd9802;
}

#verse-filter-table td {
  width: 50%;
  padding: 5px;
  border-width: 1px 0px 1px 0px;
  border-color: #ffdaa3;
  border-style: solid;
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

sortedSongs = [];

function log(msg) {
  console.log('Verse:', msg);
}

function waitForPage() {
  if (unsafeWindow.require && document.querySelector('#coverflow')) {
    let songs = unsafeWindow.require('songs');
    sortedSongs = songs.getSongIds().map(id => {
      let song = songs.getSong(id);
      return { id: id, artist: song.artist, name: song.name };
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
  dialog.innerHTML = '<div><input id="verse-filter-text" type="text"><span id="verse-expand-button" class="verse-expand-button verse-expand-hidden"></span></div><div id="tdiv" class="verse-hidden"></div>';
  parent.appendChild(dialog);

  tdiv = document.getElementById('tdiv');
  tdiv.id = 'verse-table-div';
  table = document.createElement('table');
  table.id = 'verse-filter-table';
  sortedSongs.forEach(song => {
    let row = table.insertRow();
    //let image = row.insertCell(-1);
    let artist = row.insertCell(-1);
    let title = row.insertCell(-1);
    
    artist.innerText = song.artist;
    title.innerText = song.name;
    row.artistLower = song.artist.toLowerCase();
    row.titleLower = song.name.toLowerCase();
    
    row.onclick = (_ => unsafeWindow.jd.gui.songSelection.focusSong(song.id, 0));
  });
  tdiv.innerHTML = '';
  tdiv.appendChild(table);

  let filterText = document.getElementById('verse-filter-text');
  filterText.placeholder = 'Find songs (' + sortedSongs.length + ')';
  filterText.onkeyup = (e => {
    let lower = e.target.value.toLowerCase();
    for (let i = 0; i < table.rows.length; i++) {
      let row = table.rows[i];
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

