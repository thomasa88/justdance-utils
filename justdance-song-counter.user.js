// ==UserScript==
// @name JDN Song Counter
// @description Counts the number of played songs in the current Just Dance Now session
// @version 1.0.0
// @license GNU GPL v3. Copyright Thomas Axelsson 2020
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
.song-counter-text {
  font-size: 35%;
  margin-right: 0.2em;
  align-self: center;
}
`);

$ = null;
songCount = 0;

function waitLoad() {
  $ = unsafeWindow.jQuery;
  if (typeof $ !== 'undefined' &&
      $('.song-action__button').length != 0 &&
      $('.toggles') != 0) {
      run();
  } else {
    setTimeout(waitLoad, 1000);
  }
}

function run() {
  $('.toggles').prepend(
    $('<span></span>').
      addClass('song-counter-text').
      text(songCount));
  
  $('.song-action__button').on('click', e => {
    if ($(e.target).parent().hasClass('song-action--start')) {
      $('.song-counter-text').text(++songCount);
    }
  });
}

waitLoad();
