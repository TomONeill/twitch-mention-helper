# Twitch Mention Helper
This userscript helps keeping track of chat mentions. I'm currently working on it and there's not much to see right now, however you might still want to consider installing it.<BR />
At the moment a notification sound is heard whenever you (or anyone specified in `_usernamesToTrack`) get @mentioned and opening the console shows you at what time that was + the message itself.<BR />More is in the works!
<BR/><BR/>
Version <strong>0.1</strong>

<A HREF="https://github.com/TomONeill/twitch-mention-helper/raw/master/twitch-mention-helper-latest.user.js">INSTALL</A>

# Screenshot
<A HREF="https://raw.githubusercontent.com/TomONeill/twitch-mention-helper/master/screenshot.png"><IMG SRC="https://raw.githubusercontent.com/TomONeill/twitch-mention-helper/master/screenshot.png" width="100" height="600" /></A>

# Changelog
<A HREF="https://raw.githubusercontent.com/TomONeill/twitch-mention-helper/master/changelog.txt">View changelog</A>

# Donate
If you like my work so much you feel like doing something nice for me, a complete stranger of the internet, you can.<BR />
<A HREF="https://www.paypal.me/TomONeill">Donate here</A>.

# Development
If you want to help with the development, feel free to shoot me a Pull Request!<BR />
You might want to work with your favourite IDE instead, so here's how to do just that:
1. Make sure you have ticked the box `Allow access to file URLs` for the Tampermonkey/other extension.
2. Add a new userscript with the following content:
```
	// ==UserScript==
	// @name         Twitch Mention Helper
	// @namespace    https://www.twitch.tv/
	// @version      0.1-dev
	// @description  Saves timestamp of mentions and notifies the user with sound
	// @updateURL 	 https://github.com/TomONeill/twitch-mention-helper/raw/master/twitch-mention-helper-latest.user.js
	// @match        https://www.twitch.tv/*
	// @run-at       document-end
	// @grant        unsafeWindow
	// @domain       https://www.twitch.tv
	// @require      file://{YOUR_CLONE}\twitch-mention-helper-latest.user.js
	// @author       TomONeill
	// @copyright    2020, TomONeill
	// ==/UserScript==
	/* jshint -W097 */
	/* console */
	'use strict';
```
3. Start editing the userscript in your favourite IDE!
