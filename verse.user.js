// ==UserScript==
// @name Verse
// @version 0.1.1
// @namespace thomasa88
// @match *://justdancenow.com/
// @grant GM_addStyle
// @license
// ==/UserScript==

GM_addStyle(`
#verse-filter-dialog {
  position: absolute;
  right: 0;
  top: 70px;
  height: calc(100% - 70px);
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
}

#verse-filter-table tr {
  cursor: pointer;
}

#verse-filter-table tr:hover {
  background-color: #fd9802;
}

#verse-filter-table tr:nth-child(2n) {
  background-color: #fcdc81;
}

#verse-filter-table td {
  width: 50%;
  padding: 5px;
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
  dialog.innerHTML = '<div><input id="verse-filter-text" type="text"></div><div id="tdiv"></div>';
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
  filterText.placeholder = 'Filter ' + sortedSongs.length + ' songs';
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
}

