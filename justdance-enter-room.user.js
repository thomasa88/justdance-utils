// ==UserScript==
// @name Auto-enter Just Dance room
// @version 0.1.0
// @license GNU GPL v3. Copyright Thomas Axelsson 2019
// @namespace thomasa88
// @match *://justdancenow.com/
// @grant none
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

function enterRoom() {
  if (document.querySelector('.launch-game') && document.querySelector('.init-spinner') &&
      document.querySelector('.init-spinner').style.display == 'none') {
    console.log("Entering room");
    document.querySelector('.launch-game').click();
  } else {
    console.log("Waiting for room button to get ready")
    setTimeout(enterRoom, 1000);
  }
}

enterRoom();
