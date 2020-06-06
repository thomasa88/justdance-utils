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

var autoplayClicked = false;
var autoplayClickTries = 10;

function enterRoom() {
  if (document.querySelector('.launch-game') && document.querySelector('.init-spinner') &&
      document.querySelector('.init-spinner').style.display == 'none') {
    console.log("Entering room");
    document.querySelector('.launch-game').click();
    clickOnAutoplay();
  } else {
    console.log("Waiting for room button to get ready");
    setTimeout(enterRoom, 1000);
  }
}

function clickOnAutoplay() {
  console.log("Waiting for autoplay dialog");
  document.querySelectorAll('.pop-up__wrapper:not(.pop-up--hidden)').forEach(e => {
    if (e.querySelector('.pop-up__title').innerText.indexOf('autoplay videos have been disabled') != -1) {
      e.querySelector('.pop-up__btn--validate').click();
      autoplayClicked = true;
      console.log("Autoplay dialog closed");
    }
  });
  
  // The autoplay warning is not shown on Linux (because the site assumes it to be a TV..)
  autoplayClickTries--;
  if (!autoplayClicked && autoplayClickTries > 0) {
    setTimeout(clickOnAutoplay, 1000);
  }
}

enterRoom();
